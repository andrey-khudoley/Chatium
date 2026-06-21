// @shared-route
import { requireAccountRole } from '@app/auth'
import { publishSampleNote } from '../lib/coreBrokerClient.lib'

export const sampleModulePublishNoteRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return publishSampleNote(ctx, (req.body ?? {}) as Record<string, unknown>)
})
