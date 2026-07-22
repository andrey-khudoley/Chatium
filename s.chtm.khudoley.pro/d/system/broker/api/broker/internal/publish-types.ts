import { updatePublishTypesCore, type UpdateTypesParams } from '../../../lib/broker/update-types'

/** Internal-обновление allowedPublishTypes (§5.3). */
export const brokerPublishTypesFn = app.function('/', async (ctx, params: UpdateTypesParams) => {
  return updatePublishTypesCore(ctx, params)
})
