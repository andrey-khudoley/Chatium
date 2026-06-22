// @shared-route
import { requireAccountRole } from '@app/auth'
import { requeueBrokerDelivery } from '../../../../lib/broker/internalApi.lib'

export const adminBrokerDeliveryRequeueRoute = app
  .post('/')
  .body((s) => ({
    deliveryId: s.string().optional(),
    reason: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    return requeueBrokerDelivery(ctx, req.body)
  })
