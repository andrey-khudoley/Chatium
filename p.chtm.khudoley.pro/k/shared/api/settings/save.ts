// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../lib/settings.lib'

export const saveSettingRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const { key, value } = req.body as { key?: string; value?: unknown }

  if (!key || value === undefined) {
    return { success: false, error: 'Key and value are required' }
  }

  try {
    await settingsLib.setSetting(ctx, key.trim(), value)
    ctx.account.log('Setting saved', { level: 'info', json: { key } })
    return { success: true }
  } catch (error) {
    ctx.account.log('Error saving setting', {
      level: 'error',
      json: { key, error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
