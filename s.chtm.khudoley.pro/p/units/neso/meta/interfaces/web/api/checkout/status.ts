// @shared-route
import * as loggerLib from '../../lib/logger.lib'
import * as checkoutRequestsRepo from '../../repos/checkoutRequests.repo'
import { processOrderCreatedDeliveries } from '../../lib/checkout/processOrderCreated.lib'
import { POLL_BATCH_LIMIT } from '../../lib/checkout/constants'

const LOG_MODULE = 'api/checkout/status'

export const checkoutStatusRoute = app.post('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] вход`,
    payload: { hasBody: !!req.body }
  })

  const rawRequestKey = (req.body as Record<string, unknown>)?.requestKey
  const requestKey = typeof rawRequestKey === 'string' ? rawRequestKey.trim() : ''
  if (!requestKey) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] отсутствует requestKey`,
      payload: {}
    })
    return { success: false, status: 'unknown', error: 'requestKey обязателен' }
  }

  // Основной драйвер доставки: poll → обработка → ack (§6.3 spec)
  await processOrderCreatedDeliveries(ctx, { limit: POLL_BATCH_LIMIT, maxBatches: 1 })

  // Возвращаем актуальный статус строки
  const row = await checkoutRequestsRepo.findByRequestKey(ctx, requestKey)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] статус`,
    payload: { requestKey, status: row?.status ?? 'unknown', hasPaymentUrl: !!row?.paymentUrl }
  })

  return {
    success: true,
    status: row?.status ?? 'unknown',
    paymentUrl: row?.paymentUrl || undefined
  }
})

export default checkoutStatusRoute
