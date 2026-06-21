import * as settingsLib from '../settings.lib'
import * as logsRepo from '../../repos/logs.repo'
import * as loggerLib from '../logger.lib'

const LOG_MODULE = 'lib/admin/dashboard.lib'

export type DashboardCounts = {
  errorCount: number
  warnCount: number
  resetAt: number
}

/**
 * Получить счётчики ошибок и предупреждений дашборда после таймштампа сброса.
 */
export async function getDashboardCounts(ctx: app.Ctx): Promise<DashboardCounts> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getDashboardCounts entry`,
    payload: {}
  })
  const resetAt = await settingsLib.getDashboardResetAt(ctx)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getDashboardCounts resetAt`,
    payload: { resetAt }
  })
  const [errorCount, warnCount] = await Promise.all([
    logsRepo.countErrorsAfter(ctx, resetAt),
    logsRepo.countWarningsAfter(ctx, resetAt)
  ])
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getDashboardCounts counts`,
    payload: { errorCount, warnCount }
  })
  const result = { errorCount, warnCount, resetAt }
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getDashboardCounts exit`,
    payload: result
  })
  return result
}

/**
 * Сбросить дашборд: записать текущий таймштамп в настройки.
 * Возвращает нулевые счётчики и новый resetAt (опциональное предложение — без повторного GET).
 */
export async function resetDashboard(ctx: app.Ctx): Promise<DashboardCounts> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] resetDashboard entry`,
    payload: {}
  })
  const resetAt = Date.now()
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] resetDashboard resetAt`,
    payload: { resetAt }
  })
  await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.DASHBOARD_RESET_AT, resetAt)
  const result = { errorCount: 0, warnCount: 0, resetAt }
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] resetDashboard exit`,
    payload: result
  })
  return result
}
