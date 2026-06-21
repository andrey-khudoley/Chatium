// @shared-route
import { requireAccountRole } from '@app/auth'
import { toggleBrokerModule } from '../../../../lib/broker/internalApi.lib'

export const adminBrokerModuleToggleRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return toggleBrokerModule(
    ctx,
    req.body as { moduleKey?: unknown; enabled?: unknown; reason?: unknown }
  )
})
