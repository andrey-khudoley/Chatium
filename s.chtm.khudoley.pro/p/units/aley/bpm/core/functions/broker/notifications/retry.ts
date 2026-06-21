import { retryBrokerNotifications } from '../../../lib/broker/internalApi.lib'
import type { RetryBrokerNotificationsRequest } from '../../../lib/broker/types.lib'

export const brokerRetryNotificationsFunction = app.function(
  '/broker/notifications/retry',
  async (ctx, params: RetryBrokerNotificationsRequest) => {
    return retryBrokerNotifications(ctx, params)
  }
)
