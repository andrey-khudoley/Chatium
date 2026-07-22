import { updatePublishTypesCore } from '../../lib/broker/update-types'

/** External-обновление allowedPublishTypes (§5.3) — токен обязателен. */
export const brokerPublishTypesRoute = app
  .post('/')
  .body((s) => ({
    moduleKey: s.string(),
    authToken: s.string(),
    types: s.array(s.string())
  }))
  .handle(async (ctx, req) => {
    return updatePublishTypesCore(ctx, req.body)
  })
