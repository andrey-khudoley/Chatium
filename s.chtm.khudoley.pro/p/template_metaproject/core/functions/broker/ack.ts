import { ackBrokerDeliveries } from '../../lib/broker/internalApi.lib'
import type { AckDeliveriesRequest } from '../../lib/broker/types.lib'

export const brokerAckFunction = app.function(
  '/broker/ack',
  async (
    ctx,
    params: { consumerModule: string; authToken?: string; request: AckDeliveriesRequest },
    callerInfo
  ) => {
    return ackBrokerDeliveries(
      ctx,
      params.consumerModule,
      params.request,
      callerInfo as any,
      params.authToken
    )
  }
)
