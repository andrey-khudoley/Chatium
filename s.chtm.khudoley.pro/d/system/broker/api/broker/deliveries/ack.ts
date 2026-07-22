import { ackDeliveryCore } from '../../../lib/broker/pull'

/** External ackDelivery (§5.9.3) — подтверждение успешной обработки одной доставки. */
export const brokerAckDeliveryRoute = app
  .post('/')
  .body((s) => ({
    moduleKey: s.string(),
    authToken: s.string(),
    deliveryId: s.string(),
    claimToken: s.string()
  }))
  .handle(async (ctx, req) => {
    return ackDeliveryCore(ctx, req.body)
  })
