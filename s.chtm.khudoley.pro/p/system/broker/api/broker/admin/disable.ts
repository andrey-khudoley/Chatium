// @shared-route
import { requireAccountRole } from '@app/auth'
import { disableModuleCore } from '../../../lib/broker/admin-status'

/** Admin-only выключение модуля (§5.7) — не модульный API, вне развилки source. */
export const brokerAdminDisableRoute = app
  .post('/')
  .body((s) => ({
    moduleKey: s.string(),
    reason: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    return disableModuleCore(ctx, req.body)
  })
