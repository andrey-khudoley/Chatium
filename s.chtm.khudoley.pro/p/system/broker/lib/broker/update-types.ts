import { BrokerModules, type BrokerModulesRow } from '../../tables/modules.table'
import { type BrokerResult, assertCondition, runOperation } from './result'
import { validatePatterns } from './glob'
import { authenticateModule } from './auth'
import { publishSystemEvent } from './audit'
import { writeServerLog } from '../log/logger'
import { RESERVED_EVENT_PREFIX } from '../../config/constants'

export type UpdateTypesParams = {
  moduleKey: string
  authToken: string
  types: string[]
}

export type UpdateTypesResult = { result: 'applied' | 'pending' }

/** Сужение = каждый паттерн нового набора литерально входит в старый (план, допущения). */
function isNarrowing(oldTypes: string[], newTypes: string[]): boolean {
  return newTypes.every((t) => oldTypes.includes(t))
}

/**
 * Обновление allowedPublishTypes (§5.3). internal или external-сужение —
 * применяется сразу; external-расширение — уходит в pendingPublishTypes,
 * боевое поле и status не трогаются (модуль продолжает работать, §5.6).
 */
export async function updatePublishTypesCore(
  ctx: RichUgcCtx,
  params: UpdateTypesParams
): Promise<BrokerResult<UpdateTypesResult>> {
  return runOperation(ctx, async () => {
    const row: BrokerModulesRow = await authenticateModule(ctx, params.moduleKey, params.authToken)

    const patternError = validatePatterns(params.types)
    assertCondition(!patternError, 'invalid_pattern', patternError ?? '')
    assertCondition(
      !params.types.some((t) => t.startsWith(RESERVED_EVENT_PREFIX)),
      'reserved_namespace',
      `broker: publish types must not use reserved "${RESERVED_EVENT_PREFIX}" namespace`
    )

    const narrowing = isNarrowing(row.allowedPublishTypes, params.types)
    const applied = row.source === 'internal' || narrowing

    if (applied) {
      await BrokerModules.update(ctx, { id: row.id, allowedPublishTypes: params.types })
    } else {
      await BrokerModules.update(ctx, { id: row.id, pendingPublishTypes: params.types })
    }

    await publishSystemEvent(ctx, 'broker.publish-types.changed', {
      moduleKey: params.moduleKey,
      result: applied ? 'applied' : 'pending',
      types: params.types
    })
    await writeServerLog(ctx, {
      level: 'info',
      message: `broker: allowedPublishTypes update for "${params.moduleKey}" → ${applied ? 'applied' : 'pending'}`,
      marks: { moduleKey: params.moduleKey, result: applied ? 'applied' : 'pending' }
    })

    return { result: (applied ? 'applied' : 'pending') as 'applied' | 'pending' }
  })
}

/**
 * Обновление allowedSubscribeTypes (§5.4). Идентично §5.3, но без запрета
 * reserved-namespace — broker.* в subscribe разрешён (аудит-подписка, §5.2 шаг 3).
 */
export async function updateSubscribeTypesCore(
  ctx: RichUgcCtx,
  params: UpdateTypesParams
): Promise<BrokerResult<UpdateTypesResult>> {
  return runOperation(ctx, async () => {
    const row: BrokerModulesRow = await authenticateModule(ctx, params.moduleKey, params.authToken)

    const patternError = validatePatterns(params.types)
    assertCondition(!patternError, 'invalid_pattern', patternError ?? '')

    const narrowing = isNarrowing(row.allowedSubscribeTypes, params.types)
    const applied = row.source === 'internal' || narrowing

    if (applied) {
      await BrokerModules.update(ctx, { id: row.id, allowedSubscribeTypes: params.types })
    } else {
      await BrokerModules.update(ctx, { id: row.id, pendingSubscribeTypes: params.types })
    }

    await publishSystemEvent(ctx, 'broker.subscribe-types.changed', {
      moduleKey: params.moduleKey,
      result: applied ? 'applied' : 'pending',
      types: params.types
    })
    await writeServerLog(ctx, {
      level: 'info',
      message: `broker: allowedSubscribeTypes update for "${params.moduleKey}" → ${applied ? 'applied' : 'pending'}`,
      marks: { moduleKey: params.moduleKey, result: applied ? 'applied' : 'pending' }
    })

    return { result: (applied ? 'applied' : 'pending') as 'applied' | 'pending' }
  })
}
