// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../lib/settings.lib'

export const getDefaultThemeRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  try {
    const theme = await settingsLib.getDefaultTheme(ctx)
    return { success: true, theme }
  } catch (e) {
    ctx.account.log('Error getting default theme', {
      level: 'error',
      json: { error: String(e) }
    })
    return { success: false, error: String(e), theme: 'light' as const }
  }
})
