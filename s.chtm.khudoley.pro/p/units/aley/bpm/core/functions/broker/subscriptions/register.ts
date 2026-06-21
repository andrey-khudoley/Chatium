import { registerBrokerSubscriptions } from '../../../lib/broker/internalApi.lib'
import type { RegisterBrokerSubscriptionsRequest } from '../../../lib/broker/types.lib'

export const brokerRegisterSubscriptionsFunction = app.function(
  '/broker/subscriptions/register',
  async (
    ctx,
    params: {
      consumerModule: string
      authToken?: string
      request: RegisterBrokerSubscriptionsRequest
    },
    callerInfo
  ) => {
    return registerBrokerSubscriptions(
      ctx,
      params.consumerModule,
      params.request,
      callerInfo as any,
      params.authToken
    )
  }
)
