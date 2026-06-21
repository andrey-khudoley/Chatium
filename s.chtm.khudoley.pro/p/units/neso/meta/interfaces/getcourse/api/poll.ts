// @shared-route
import { requireAccountRole } from '@app/auth'
import { pollGetCourseDeliveries } from '../lib/coreBrokerClient.lib'

export const getCourseInterfacePollRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return pollGetCourseDeliveries(ctx, (req.body ?? {}) as Record<string, unknown>)
})
