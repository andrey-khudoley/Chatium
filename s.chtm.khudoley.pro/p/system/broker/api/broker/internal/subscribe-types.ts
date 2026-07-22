import { updateSubscribeTypesCore, type UpdateTypesParams } from '../../../lib/broker/update-types'

/** Internal-обновление allowedSubscribeTypes (§5.4). */
export const brokerSubscribeTypesFn = app.function('/', async (ctx, params: UpdateTypesParams) => {
  return updateSubscribeTypesCore(ctx, params)
})
