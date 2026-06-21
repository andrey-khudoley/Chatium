// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../lib/settings.lib'

export const saveDefaultThemeRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const { theme } = req.body as { theme?: string }

  if (!theme || (theme !== 'light' && theme !== 'dark')) {
    return { success: false, error: 'Invalid theme value. Must be "light" or "dark"' }
  }

  try {
    await settingsLib.saveDefaultTheme(ctx, theme as 'light' | 'dark')
    ctx.account.log('Default theme saved', { level: 'info', json: { theme } })
    return { success: true, theme }
  } catch (e) {
    ctx.account.log('Error saving default theme', {
      level: 'error',
      json: { error: String(e), theme }
    })
    return { success: false, error: String(e) }
  }
})
