// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../../lib/settings.lib'
import { writeServerLog } from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/settings/get'

/**
 * GET / — получить значение настройки по ключу.
 */
export const getAdminSettingsGetRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const key = String(req.query?.key ?? '').trim()

  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { key }
  })

  const value = await settingsLib.getSetting(ctx, key)

  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { key, value }
  })

  return { success: true, key, value }
})

export default getAdminSettingsGetRoute
