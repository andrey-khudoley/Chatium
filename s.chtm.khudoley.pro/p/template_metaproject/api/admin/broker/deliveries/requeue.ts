// @shared-route
import { requireAccountRole } from '@app/auth'
import { requeueBrokerDelivery } from '../../../../lib/broker/internalApi.lib'

export const adminBrokerDeliveryRequeueRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return requeueBrokerDelivery(ctx, req.body as { deliveryId?: unknown; reason?: unknown })
})
