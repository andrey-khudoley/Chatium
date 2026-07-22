// @shared-route
import { requireAccountRole } from '@app/auth'
import { enableModuleCore } from '../../../lib/broker/admin-status'

/** Admin-only включение модуля (§5.7) — не модульный API, вне развилки source. */
export const brokerAdminEnableRoute = app
  .post('/')
  .body((s) => ({
    moduleKey: s.string()
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    return enableModuleCore(ctx, req.body)
  })
