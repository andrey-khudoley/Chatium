// @shared-route
import { requireAccountRole } from '@app/auth'
import { toggleBrokerSubscription } from '../../../../lib/broker/internalApi.lib'

export const adminBrokerSubscriptionToggleRoute = app
  .post('/')
  .body((s) => ({
    subscriptionKey: s.string().optional(),
    enabled: s.boolean().optional(),
    reason: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    return toggleBrokerSubscription(ctx, req.body)
  })
