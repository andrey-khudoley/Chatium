// @shared-route
import { requireAccountRole } from '@app/auth'
import * as dashboardLib from '../../../lib/admin/dashboard.lib'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/dashboard/reset'

/**
 * POST /api/admin/dashboard/reset — сбросить дашборд (записать таймштамп сброса в настройки).
 * Возвращает errorCount: 0, warnCount: 0, resetAt. Только Admin.
 */
export const resetDashboardRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос сброса дашборда`,
    payload: {}
  })

  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Вызов dashboardLib.resetDashboard`,
      payload: {}
    })
    const counts = await dashboardLib.resetDashboard(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Переменные counts`,
      payload: counts
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Дашборд сброшен`,
      payload: { resetAt: counts.resetAt }
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Возврат success`,
      payload: counts
    })
    return { success: true, ...counts }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка сброса дашборда`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
