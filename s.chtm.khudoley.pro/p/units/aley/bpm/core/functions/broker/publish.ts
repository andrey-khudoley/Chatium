import { publishBrokerEvent } from '../../lib/broker/internalApi.lib'
import type { PublishEventRequest } from '../../lib/broker/types.lib'

export const brokerPublishFunction = app.function(
  '/broker/publish',
  async (
    ctx,
    params: { producerModule: string; authToken?: string; request: PublishEventRequest },
    callerInfo
  ) => {
    return publishBrokerEvent(
      ctx,
      params.producerModule,
      params.request,
      callerInfo as any,
      params.authToken
    )
  }
)
