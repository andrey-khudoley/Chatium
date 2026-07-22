import { deleteModuleCore } from '../../lib/broker/delete-module'

/** External-удаление регистрации модуля (§5.5) — токен обязателен. */
export const brokerDeleteRoute = app
  .post('/')
  .body((s) => ({
    moduleKey: s.string(),
    authToken: s.string()
  }))
  .handle(async (ctx, req) => {
    return deleteModuleCore(ctx, req.body)
  })
