import { deadDeliveryCore } from '../../../lib/broker/pull'

/** External deadDelivery (§5.9.4) — признать доставку необрабатываемой. */
export const brokerDeadDeliveryRoute = app
  .post('/')
  .body((s) => ({
    moduleKey: s.string(),
    authToken: s.string(),
    deliveryId: s.string(),
    claimToken: s.string(),
    lastError: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    return deadDeliveryCore(ctx, req.body)
  })
