import { deadDeliveryCore, type DeadDeliveryParams } from '../../../lib/broker/pull'

/** Internal deadDelivery (§5.9.4). */
export const brokerDeadDeliveryFn = app.function('/', async (ctx, params: DeadDeliveryParams) => {
  return deadDeliveryCore(ctx, params)
})
