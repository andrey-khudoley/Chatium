// @shared-route
/**
 * `POST /api/payment-page/method-delete` — удаление кастомного метода оплаты.
 *
 * Body: `{ methodKey }`.
 * Системные методы (isSystem=true) удалить нельзя — FAIL-CLOSED на сервере.
 * При отсутствии метода — NOT_FOUND.
 *
 * Доступ — guardInternalApi. Помечен // @shared-route для .run() из Vue.
 */

import { runWithExclusiveLock } from '@app/sync'
import * as loggerLib from '../../lib/logger.lib'
import * as repo from '../../repos/paymentPageMethods.repo'
import { guardInternalApi } from '../../lib/access/apiGuard'

const LOG_PATH = 'api/payment-page/method-delete'

export const paymentPageMethodDeleteRoute = app.post('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const body = req.body as { methodKey?: unknown }
  const methodKey = typeof body?.methodKey === 'string' ? body.methodKey.trim() : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { methodKey }
  })

  if (!methodKey) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] methodKey_missing`,
      payload: {}
    })
    return { success: false, error: 'methodKey не может быть пустым' }
  }

  try {
    let result: { success: boolean; error?: string } = { success: false, error: 'NOT_FOUND' }

    const row = await repo.getByMethodKey(ctx, methodKey)

    if (!row) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] not_found`,
        payload: { methodKey }
      })
      return { success: false, error: 'NOT_FOUND' }
    }

    if (row.isSystem) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] system_method_delete_forbidden`,
        payload: { methodKey }
      })
      return { success: false, error: 'SYSTEM_METHOD_DELETE_FORBIDDEN' }
    }

    await runWithExclusiveLock(ctx, 'yakovleva-pay:pp-method-write', async () => {
      await repo.deleteByMethodKey(ctx, methodKey)
      result = { success: true }
    })

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] deleted`,
      payload: { methodKey }
    })

    return result
  } catch (error) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] error`,
        payload: { methodKey, error: String(error) }
      })
    } catch {
      /* fail-open */
    }
    return { success: false, error: String(error) }
  }
})

export default paymentPageMethodDeleteRoute
