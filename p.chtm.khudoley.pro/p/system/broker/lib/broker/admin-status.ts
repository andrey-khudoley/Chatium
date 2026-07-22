import { BrokerModules } from '../../tables/modules.table'
import { type BrokerResult, assertCondition, runOperation } from './result'
import { publishSystemEvent } from './audit'
import { writeServerLog } from '../log/logger'

export type DisableModuleParams = { moduleKey: string; reason?: string }
export type EnableModuleParams = { moduleKey: string }
export type AdminStatusResult = { status: 'active' | 'disabled' }

/**
 * Выключение модуля админом (§5.7): active → disabled. Применяется только из
 * active. Токен не участвует — авторизация на роутах (requireAccountRole).
 * pending* не трогается (оси независимы, §5.6).
 */
export async function disableModuleCore(
  ctx: RichUgcCtx,
  params: DisableModuleParams
): Promise<BrokerResult<AdminStatusResult>> {
  return runOperation(ctx, async () => {
    const row = await BrokerModules.findOneBy(ctx, { moduleKey: params.moduleKey })
    assertCondition(row, 'module_not_found', `broker: module "${params.moduleKey}" not found`)
    assertCondition(
      row.status === 'active',
      'invalid_status',
      `broker: module "${params.moduleKey}" is not active (status=${row.status})`
    )

    await BrokerModules.update(ctx, { id: row.id, status: 'disabled' })
    await publishSystemEvent(ctx, 'broker.module.status-changed', {
      moduleKey: params.moduleKey,
      from: 'active',
      to: 'disabled',
      reason: params.reason ?? null
    })
    await writeServerLog(ctx, {
      level: 'info',
      message: `broker: module "${params.moduleKey}" disabled`,
      marks: { moduleKey: params.moduleKey }
    })

    return { status: 'disabled' as const }
  })
}

/** Включение модуля админом (§5.7): disabled → active, без ре-модерации. */
export async function enableModuleCore(
  ctx: RichUgcCtx,
  params: EnableModuleParams
): Promise<BrokerResult<AdminStatusResult>> {
  return runOperation(ctx, async () => {
    const row = await BrokerModules.findOneBy(ctx, { moduleKey: params.moduleKey })
    assertCondition(row, 'module_not_found', `broker: module "${params.moduleKey}" not found`)
    assertCondition(
      row.status === 'disabled',
      'invalid_status',
      `broker: module "${params.moduleKey}" is not disabled (status=${row.status})`
    )

    await BrokerModules.update(ctx, { id: row.id, status: 'active' })
    await publishSystemEvent(ctx, 'broker.module.status-changed', {
      moduleKey: params.moduleKey,
      from: 'disabled',
      to: 'active'
    })
    await writeServerLog(ctx, {
      level: 'info',
      message: `broker: module "${params.moduleKey}" enabled`,
      marks: { moduleKey: params.moduleKey }
    })

    return { status: 'active' as const }
  })
}
