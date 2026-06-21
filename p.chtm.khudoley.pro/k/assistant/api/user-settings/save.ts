// @shared-route
import { requireRealUser } from '@app/auth'
import * as userSettingsLib from '../../lib/user-settings.lib'

/**
 * POST /api/user-settings/save — сохранить смещение UTC (целые часы).
 * Body: { timezoneOffsetHours: number }
 */
export const saveUserSettingsRoute = app
  .body((s) => ({
    timezoneOffsetHours: s.number(),
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    try {
      const timezoneOffsetHours = await userSettingsLib.saveTimezoneOffsetHours(
        ctx,
        user.id,
        req.body.timezoneOffsetHours,
      )
      return { success: true, timezoneOffsetHours }
    } catch (error) {
      ctx.account.log('user-settings/save failed', {
        level: 'error',
        json: { userId: user.id, error: String(error) },
      })
      return { success: false, error: 'Не удалось сохранить настройки' }
    }
  })

export default saveUserSettingsRoute
