// @shared-route
import { requireAccountRole } from '@app/auth'
import { getBrokerDiagnostics } from '../../../lib/broker/internalApi.lib'

export const adminBrokerDiagnosticsRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return getBrokerDiagnostics(ctx, {
    moduleKey: typeof req.query.moduleKey === 'string' ? req.query.moduleKey : undefined,
    eventType: typeof req.query.eventType === 'string' ? req.query.eventType : undefined,
    eventId: typeof req.query.eventId === 'string' ? req.query.eventId : undefined,
    subscriptionKey:
      typeof req.query.subscriptionKey === 'string' ? req.query.subscriptionKey : undefined,
    deliveryStatus:
      typeof req.query.deliveryStatus === 'string' ? req.query.deliveryStatus : undefined,
    notificationStatus:
      typeof req.query.notificationStatus === 'string' ? req.query.notificationStatus : undefined,
    limit: req.query.limit === undefined ? undefined : Number(req.query.limit)
  })
})
