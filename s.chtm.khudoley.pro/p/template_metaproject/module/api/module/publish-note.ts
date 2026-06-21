// @shared-route
import { requireAccountRole } from '@app/auth'
import { publishSampleNote } from '../../lib/broker/coreBrokerClient.lib'

export const templateModulePublishNoteRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return publishSampleNote(ctx, (req.body ?? {}) as Record<string, unknown>)
})
