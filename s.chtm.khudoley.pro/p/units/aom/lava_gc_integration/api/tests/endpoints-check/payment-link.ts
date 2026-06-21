// @shared-route
import { requireAnyUser } from '@app/auth'
import * as paymentService from '../../../lib/lava-payment.service'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/payment-link'

/**
 * GET /api/tests/endpoints-check/payment-link — интеграционный тест: createPaymentLink (50 RUB — минимум Lava для RUB, тестовый email).
 * Уникальный `gcOrderId` на каждый вызов. Нужны настройки Lava (product/offer id и ключ). AnyUser.
 */
export const paymentLinkTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const gcOrderId = `test-pl-${Date.now()}`
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос теста createPaymentLink`,
    payload: { gcOrderId }
  })

  try {
    const result = await paymentService.createPaymentLink(ctx, {
      gcOrderId,
      buyerEmail: 'lava-test@example.com',
      amount: 50,
      currency: 'RUB',
      requestId: `test-req-${gcOrderId}`
    })
    await loggerLib.writeServerLog(ctx, {
      severity: result.success ? 6 : 4,
      message: `[${LOG_PATH}] createPaymentLink завершён`,
      payload: { success: result.success, errorCode: result.errorCode }
    })
    return { success: true, test: 'payment-link', result }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] createPaymentLink исключение`,
      payload: { error: message }
    })
    return { success: false, test: 'payment-link', error: message }
  }
})
