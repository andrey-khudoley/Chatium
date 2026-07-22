import { ackDeliveryCore, type AckDeliveryParams } from '../../../lib/broker/pull'

/** Internal ackDelivery (§5.9.3). */
export const brokerAckDeliveryFn = app.function('/', async (ctx, params: AckDeliveryParams) => {
  return ackDeliveryCore(ctx, params)
})
