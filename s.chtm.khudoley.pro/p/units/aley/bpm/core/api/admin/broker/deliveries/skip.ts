// @shared-route
import { requireAccountRole } from '@app/auth'
import { skipBrokerDelivery } from '../../../../lib/broker/internalApi.lib'

export const adminBrokerDeliverySkipRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return skipBrokerDelivery(ctx, req.body as { deliveryId?: unknown; reason?: unknown })
})
