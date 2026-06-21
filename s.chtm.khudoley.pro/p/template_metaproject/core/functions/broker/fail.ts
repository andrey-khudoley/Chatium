import { failBrokerDeliveries } from '../../lib/broker/internalApi.lib'
import type { FailDeliveriesRequest } from '../../lib/broker/types.lib'

export const brokerFailFunction = app.function(
  '/broker/fail',
  async (
    ctx,
    params: { consumerModule: string; authToken?: string; request: FailDeliveriesRequest },
    callerInfo
  ) => {
    return failBrokerDeliveries(
      ctx,
      params.consumerModule,
      params.request,
      callerInfo as any,
      params.authToken
    )
  }
)
