import { publishEventCore, type PublishEventParams } from '../../../lib/broker/publish'

/** Internal-публикация события (§5.8). */
export const brokerPublishFn = app.function('/', async (ctx, params: PublishEventParams) => {
  return publishEventCore(ctx, params)
})
