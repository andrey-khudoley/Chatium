// @shared-route
import { requireAccountRole } from '@app/auth'
import { publishGetCourseRawEvent } from '../../lib/broker/coreBrokerClient.lib'

export const getcourseModulePublishEventRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return publishGetCourseRawEvent(ctx, (req.body ?? {}) as Record<string, unknown>)
})
