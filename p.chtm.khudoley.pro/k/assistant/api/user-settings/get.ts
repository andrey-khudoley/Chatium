// @shared-route
import { requireRealUser } from '@app/auth'
import * as userSettingsLib from '../../lib/user-settings.lib'

/**
 * GET /api/user-settings/get — текущие персональные настройки (часовой пояс).
 */
export const getUserSettingsRoute = app.get('/', async (ctx) => {
  const user = requireRealUser(ctx)
  const timezoneOffsetHours = await userSettingsLib.getEffectiveTimezoneOffsetHours(ctx, user.id)
  return { success: true, timezoneOffsetHours }
})

export default getUserSettingsRoute
