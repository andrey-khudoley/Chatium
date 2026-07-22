import { AccessDeniedError } from '@app/errors'
import { BrokerModules, type BrokerModulesRow } from '../../tables/modules.table'
import { hashModuleToken } from './token'
import { assertCondition } from './result'

/**
 * Аутентификация модуля по токену (§5.1/§5.9, О5) — единообразно для всех
 * пост-регистрационных операций. Существование moduleKey не раскрывается: и
 * отсутствие строки, и несовпадение хэша дают один и тот же AccessDeniedError
 * (403) — граница доверия, обрабатывается платформой, а не конвертом брокера.
 */
export async function authenticateModule(
  ctx: RichUgcCtx,
  moduleKey: string,
  authToken: string
): Promise<BrokerModulesRow> {
  const row = await BrokerModules.findOneBy(ctx, { moduleKey })
  if (!row) {
    throw new AccessDeniedError('broker: invalid module credentials')
  }
  const hash = await hashModuleToken(moduleKey, authToken)
  if (hash !== row.authTokenHash) {
    throw new AccessDeniedError('broker: invalid module credentials')
  }
  return row
}

/** Гейт статуса (§5.9, О5): publish/fetch/ack/dead требуют status='active'. */
export function assertActive(row: BrokerModulesRow): void {
  assertCondition(
    row.status === 'active',
    'module_not_active',
    `broker: module "${row.moduleKey}" is not active (status=${row.status})`
  )
}
