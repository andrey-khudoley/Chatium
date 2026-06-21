// @shared-route
import { requireAccountRole } from '@app/auth'
import { publishGetCourseRawEvent } from '../lib/coreBrokerClient.lib'

export const getCourseInterfacePublishEventRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return publishGetCourseRawEvent(ctx, (req.body ?? {}) as Record<string, unknown>)
})
