// @shared-route
import { requireAccountRole } from '@app/auth'
import { failGetCourseDeliveries } from '../lib/coreBrokerClient.lib'

export const getCourseInterfaceFailRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return failGetCourseDeliveries(ctx, (req.body ?? {}) as Record<string, unknown>)
})
