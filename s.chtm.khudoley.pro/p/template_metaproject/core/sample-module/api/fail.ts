// @shared-route
import { requireAccountRole } from '@app/auth'
import { failSampleDeliveries } from '../lib/coreBrokerClient.lib'

export const sampleModuleFailRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return failSampleDeliveries(ctx, (req.body ?? {}) as Record<string, unknown>)
})
