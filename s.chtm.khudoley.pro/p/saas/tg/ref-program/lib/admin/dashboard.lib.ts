import * as settingsLib from '../settings.lib'
import * as logsRepo from '../../repos/logs.repo'

export type DashboardCounts = {
  errorCount: number
  warnCount: number
  resetAt: number
}

/**
 * Получить счётчики ошибок и предупреждений дашборда после таймштампа сброса.
 */
export async function getDashboardCounts(ctx: app.Ctx): Promise<DashboardCounts> {
  const resetAt = await settingsLib.getDashboardResetAt(ctx)
  const [errorCount, warnCount] = await Promise.all([
    logsRepo.countErrorsAfter(ctx, resetAt),
    logsRepo.countWarningsAfter(ctx, resetAt)
  ])
  return { errorCount, warnCount, resetAt }
}

/**
 * Сбросить дашборд: записать текущий таймштамп в настройки.
 * Возвращает нулевые счётчики и новый resetAt (опциональное предложение — без повторного GET).
 */
export async function resetDashboard(ctx: app.Ctx): Promise<DashboardCounts> {
  const resetAt = Date.now()
  await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.DASHBOARD_RESET_AT, resetAt)
  return { errorCount: 0, warnCount: 0, resetAt }
}
