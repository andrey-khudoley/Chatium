import { createOrder, type CreateOrderInput } from '../../lib/orders/orders.lib'

export const orderCreateFunction = app.function(
  '/orders/create',
  async (ctx, params: CreateOrderInput, _callerInfo) => {
    return createOrder(ctx, params)
  }
)
