// @shared-route
import { requireAccountRole } from '@app/auth'
import { toggleBrokerModule } from '../../../../lib/broker/internalApi.lib'

export const adminBrokerModuleToggleRoute = app
  .post('/')
  .body((s) => ({
    moduleKey: s.string().optional(),
    enabled: s.boolean().optional(),
    reason: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    return toggleBrokerModule(ctx, req.body)
  })
