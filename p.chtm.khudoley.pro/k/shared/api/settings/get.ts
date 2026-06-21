// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../lib/settings.lib'

export const getSettingRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const key = (req.query.key as string)?.trim()
  if (!key) {
    return { success: false, error: 'Key parameter is required' }
  }

  try {
    const value = await settingsLib.getSetting(ctx, key)
    if (value === null && key !== 'adminToken') {
      return { success: false, error: `Setting ${key} not found` }
    }
    return { success: true, value }
  } catch (error) {
    ctx.account.log('Error getting setting', {
      level: 'error',
      json: { key, error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
