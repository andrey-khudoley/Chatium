// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerSettings from '../../lib/logger-settings.lib'

export const apiLoggingSetLevelRoute = app
  .body((s) => ({ level: s.string() }))
  .post('/', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    const { level } = req.body
    if (!loggerSettings.isLogLevel(level)) {
      return {
        success: false,
        error: `level должен быть одним из: ${loggerSettings.LOG_LEVELS.join(', ')}`
      }
    }
    try {
      await loggerSettings.setLogLevel(ctx, level)
      return { success: true, level }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Ошибка установки уровня' }
    }
  })
