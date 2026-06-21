// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../lib/settings.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/settings/list'

/**
 * GET /api/settings/list — список всех настроек (с дефолтами).
 * Только Admin.
 */
export const listSettingsRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Получен запрос на список настроек`,
    payload: {}
  })

  try {
    const settings = await settingsLib.getAllSettings(ctx)
    const keys = Object.keys(settings)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Список настроек получен`,
      payload: { count: keys.length, keys }
    })
    return { success: true, settings }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка получения списка настроек`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
