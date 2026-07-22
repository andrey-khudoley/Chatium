import { updateSubscribeTypesCore } from '../../lib/broker/update-types'

/** External-обновление allowedSubscribeTypes (§5.4) — токен обязателен. */
export const brokerSubscribeTypesRoute = app
  .post('/')
  .body((s) => ({
    moduleKey: s.string(),
    authToken: s.string(),
    types: s.array(s.string())
  }))
  .handle(async (ctx, req) => {
    return updateSubscribeTypesCore(ctx, req.body)
  })
