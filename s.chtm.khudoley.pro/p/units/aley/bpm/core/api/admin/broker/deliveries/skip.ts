// @shared-route
import { requireAccountRole } from '@app/auth'
import { skipBrokerDelivery } from '../../../../lib/broker/internalApi.lib'

export const adminBrokerDeliverySkipRoute = app
  .post('/')
  .body((s) => ({
    deliveryId: s.string().optional(),
    reason: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    return skipBrokerDelivery(ctx, req.body)
  })
