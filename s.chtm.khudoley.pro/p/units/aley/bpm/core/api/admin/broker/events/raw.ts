// @shared-route
import { requireAccountRole } from '@app/auth'
import { getBrokerEventRaw } from '../../../../lib/broker/internalApi.lib'

export const adminBrokerEventRawRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return getBrokerEventRaw(ctx, req.body as { eventId?: unknown; reason?: unknown })
})
