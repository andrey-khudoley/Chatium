// @shared-route
import { requireAccountRole } from '@app/auth'
import { ackSampleDeliveries } from '../lib/coreBrokerClient.lib'

export const sampleModuleAckRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return ackSampleDeliveries(ctx, (req.body ?? {}) as Record<string, unknown>)
})
