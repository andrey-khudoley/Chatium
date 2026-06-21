// @shared-route
import { requireAnyUser } from '@app/auth'
import * as gcApi from '../../../lib/getcourse-api.client'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/getcourse-deal-update'

/**
 * GET /api/tests/endpoints-check/getcourse-deal-update — updateDealStatus завершается без throw
 * (при отсутствии gc_api_key / домена — no-op в клиенте).
 */
export const getcourseDealUpdateTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Вызов updateDealStatus (тестовый заказ)`,
    payload: {}
  })

  try {
    await gcApi.updateDealStatus(ctx, {
      gcOrderId: `test-gc-${Date.now()}`,
      buyerEmail: 'gc-api-test@example.com',
      dealStatus: 'in_work',
      dealIsPaid: 1
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] updateDealStatus завершён`,
      payload: {}
    })
    return { success: true, test: 'getcourse-deal-update', at: Date.now() }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] исключение`,
      payload: { error: message }
    })
    return { success: false, test: 'getcourse-deal-update', error: message }
  }
})
