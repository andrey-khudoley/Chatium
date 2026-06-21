/**
 * Дедупликация webhook от LifePay (implementation-plan §1.8.3).
 *
 * Heap-схема не выражает unique constraint напрямую, поэтому используется
 * `runWithExclusiveLock` + проверка наличия по `number` + создание.
 */

import { runWithExclusiveLock } from '@app/sync'

import { WebhookIdempotency } from '../tables/webhookIdempotency.table'
import type { WebhookIdempotencyRow } from '../tables/webhookIdempotency.table'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/webhookIdempotency.repo'

export type RegisterResult = 'first' | 'duplicate'

/**
 * Попытаться зарегистрировать transaction number. Возвращает 'first' если запись создана,
 * 'duplicate' если number уже присутствует.
 * Гонки защищены через runWithExclusiveLock.
 */
export async function tryRegister(
  ctx: app.Ctx,
  transactionNumber: string,
  firstSeenAt: number
): Promise<RegisterResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] tryRegister entry`,
    payload: { transactionNumber }
  })

  const lockKey = `yakovleva-pay:webhook-idempotency:${transactionNumber}`

  const result: RegisterResult = await runWithExclusiveLock(
    ctx,
    lockKey,
    async (lockCtx: app.Ctx) => {
      const existing = await WebhookIdempotency.findAll(lockCtx, {
        where: { number: transactionNumber },
        limit: 1
      })
      if (existing.length > 0) {
        return 'duplicate' as RegisterResult
      }
      await WebhookIdempotency.create(lockCtx, {
        number: transactionNumber,
        firstSeenAt
      })
      return 'first' as RegisterResult
    }
  )

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] tryRegister exit`,
    payload: { transactionNumber, result }
  })
  return result
}

export async function findByNumber(
  ctx: app.Ctx,
  transactionNumber: string
): Promise<WebhookIdempotencyRow | null> {
  const rows = await WebhookIdempotency.findAll(ctx, {
    where: { number: transactionNumber },
    limit: 1
  })
  return rows[0] ?? null
}
