// @shared-route
import { requireAccountRole } from '@app/auth'
import { getBrokerEventRaw } from '../../../../lib/broker/internalApi.lib'

export const adminBrokerEventRawRoute = app
  .post('/')
  .body((s) => ({
    eventId: s.string().optional(),
    reason: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    return getBrokerEventRaw(ctx, req.body)
  })
