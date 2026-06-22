import * as ordersRepo from '../../repos/orders.repo'
import { fromMoney } from '../../lib/orders/money.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_MODULE = 'functions/orders/get'

export const orderGetFunction = app.function(
  '/orders/get',
  async (ctx, params: { orderKey?: string; idempotencyKey?: string }, _callerInfo) => {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] вход`,
      payload: { hasOrderKey: !!params.orderKey, hasIdempotencyKey: !!params.idempotencyKey }
    })

    let order = null
    if (params.orderKey) {
      order = await ordersRepo.findByOrderKey(ctx, params.orderKey)
    } else if (params.idempotencyKey) {
      order = await ordersRepo.findByIdempotencyKey(ctx, params.idempotencyKey)
    }

    if (!order) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_MODULE}] не найден`,
        payload: { orderKey: params.orderKey, idempotencyKey: params.idempotencyKey }
      })
      return { ok: false, error: 'not_found' }
    }

    const { amount, currency } = fromMoney(order.amount)

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] найден`,
      payload: { orderKey: order.orderKey, status: order.status }
    })

    return {
      ok: true,
      order: {
        orderKey: order.orderKey,
        idempotencyKey: order.idempotencyKey,
        status: order.status,
        paymentUrl: order.paymentUrl,
        gcDealId: order.gcDealId,
        gcDealNumber: order.gcDealNumber,
        offerId: order.offerId,
        amount,
        currency,
        userEmail: order.userEmail
      }
    }
  }
)
