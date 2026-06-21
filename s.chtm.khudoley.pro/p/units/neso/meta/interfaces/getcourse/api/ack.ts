// @shared-route
import { requireAccountRole } from '@app/auth'
import { ackGetCourseDeliveries } from '../lib/coreBrokerClient.lib'

export const getCourseInterfaceAckRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return ackGetCourseDeliveries(ctx, (req.body ?? {}) as Record<string, unknown>)
})
