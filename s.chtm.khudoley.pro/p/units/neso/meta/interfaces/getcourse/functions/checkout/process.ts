import { processCheckoutSubmittedDeliveries } from '../../lib/checkout/processCheckoutSubmitted.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_MODULE = 'functions/checkout/process'

// Точка-«насос» обработки доставок web.checkout.submitted (pump-by-publisher, spec §6.2).
// Caller намеренно НЕ проверяется — как и /orders/create (реш. 1): внутренний сервис,
// вызывается доверенными модулями NeSo через runAppFunction. Побочные эффекты безопасны:
// claim в ядре эксклюзивен, createOrder идемпотентен, данные доставок приходят из ядра под authToken.
export const checkoutProcessFunction = app.function(
  '/checkout/process',
  async (ctx, params: { limit?: number; maxBatches?: number }, callerInfo) => {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] checkoutProcessFunction: вход`,
      payload: { limit: params?.limit, maxBatches: params?.maxBatches, caller: callerInfo }
    })
    return processCheckoutSubmittedDeliveries(ctx, params ?? {})
  }
)
