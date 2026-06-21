// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../../lib/settings.lib'

export const maxPollResetMarkerRoute = app.post('/', async (ctx, _req) => {
  requireAccountRole(ctx, 'Admin')
  await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.MAX_POLLING_MARKER, null)
  return { success: true, marker: null }
})
