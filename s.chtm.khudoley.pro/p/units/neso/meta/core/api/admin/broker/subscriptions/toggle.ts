// @shared-route
import { requireAccountRole } from '@app/auth'
import { toggleBrokerSubscription } from '../../../../lib/broker/internalApi.lib'

export const adminBrokerSubscriptionToggleRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return toggleBrokerSubscription(
    ctx,
    req.body as { subscriptionKey?: unknown; enabled?: unknown; reason?: unknown }
  )
})
