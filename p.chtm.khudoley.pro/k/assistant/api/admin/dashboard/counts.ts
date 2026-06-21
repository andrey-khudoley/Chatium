// @shared-route
import { requireAccountRole } from '@app/auth'
import * as dashboardLib from '../../../lib/admin/dashboard.lib'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/dashboard/counts'

/**
 * GET /api/admin/dashboard/counts — получить счётчики ошибок и предупреждений дашборда.
 * Валидирует запрос, передаёт управление в либу. Только Admin.
 */
export const getDashboardCountsRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос счётчиков дашборда`,
    payload: { queryKeys: Object.keys(req.query ?? {}) }
  })

  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Вызов dashboardLib.getDashboardCounts`,
      payload: {}
    })
    const counts = await dashboardLib.getDashboardCounts(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Переменные counts`,
      payload: counts
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Счётчики получены`,
      payload: { errorCount: counts.errorCount, warnCount: counts.warnCount, resetAt: counts.resetAt }
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Возврат success`,
      payload: counts
    })
    return { success: true, ...counts }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка получения счётчиков`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
