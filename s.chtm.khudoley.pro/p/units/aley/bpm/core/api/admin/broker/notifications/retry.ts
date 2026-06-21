// @shared-route
import { requireAccountRole } from '@app/auth'
import { retryBrokerNotifications } from '../../../../lib/broker/internalApi.lib'
import type { RetryBrokerNotificationsRequest } from '../../../../lib/broker/types.lib'

export const adminBrokerNotificationsRetryRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return retryBrokerNotifications(
    ctx,
    req.body as RetryBrokerNotificationsRequest & { reason?: unknown }
  )
})
