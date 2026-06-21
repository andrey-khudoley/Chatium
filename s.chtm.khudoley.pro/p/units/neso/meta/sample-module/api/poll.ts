// @shared-route
import { requireAccountRole } from '@app/auth'
import { pollSampleDeliveries } from '../lib/coreBrokerClient.lib'

export const sampleModulePollRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return pollSampleDeliveries(ctx, (req.body ?? {}) as Record<string, unknown>)
})
