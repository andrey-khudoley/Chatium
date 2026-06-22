// @shared-route
import { requireAccountRole } from '@app/auth'
import { getBrokerDiagnostics } from '../../../lib/broker/internalApi.lib'

export const adminBrokerDiagnosticsRoute = app
  .get('/')
  .query((s) => ({
    moduleKey: s.string().optional(),
    eventType: s.string().optional(),
    eventId: s.string().optional(),
    subscriptionKey: s.string().optional(),
    deliveryStatus: s.string().optional(),
    notificationStatus: s.string().optional(),
    limit: s.number().optional()
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    return getBrokerDiagnostics(ctx, req.query)
  })
