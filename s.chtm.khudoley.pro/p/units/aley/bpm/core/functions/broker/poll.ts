import { pollBrokerDeliveries } from '../../lib/broker/internalApi.lib'

export const brokerPollFunction = app.function(
  '/broker/poll',
  async (
    ctx,
    params: {
      consumerModule: string
      authToken?: string
      request: { subscriptionKey?: string; limit?: number }
    },
    callerInfo
  ) => {
    return pollBrokerDeliveries(
      ctx,
      params.consumerModule,
      params.request,
      callerInfo as any,
      params.authToken
    )
  }
)
