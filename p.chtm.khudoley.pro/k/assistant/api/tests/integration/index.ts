// @shared-route
import { requireAnyUser } from '@app/auth'
import * as settingsLib from '../../../lib/settings.lib'
import * as settingsRepo from '../../../repos/settings.repo'
import * as logsRepo from '../../../repos/logs.repo'
import * as dashboardLib from '../../../lib/admin/dashboard.lib'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/integration'

export type TemplateIntegrationTestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/integration — интеграция Heap + либ шаблонного минимума (без resetDashboard).
 */
export const templateIntegrationTestsRoute = app.get('/', async (ctx) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запуск интеграционного набора`,
    payload: {}
  })

  const results: TemplateIntegrationTestResult[] = []

  const push = (id: string, title: string, passed: boolean, error?: string) => {
    results.push({ id, title, passed, ...(error ? { error } : {}) })
  }

  try {
    const name = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)
    push('settings_get_project_name', 'settings.lib: getSettingString(PROJECT_NAME)', typeof name === 'string')
  } catch (e) {
    push('settings_get_project_name', 'settings.lib: getSettingString(PROJECT_NAME)', false, (e as Error)?.message ?? String(e))
  }

  try {
    const level = await settingsLib.getLogLevel(ctx)
    const ok =
      typeof level === 'string' &&
      settingsLib.LOG_LEVELS.includes(level as (typeof settingsLib.LOG_LEVELS)[number])
    push('settings_get_log_level', 'settings.lib: getLogLevel валиден', ok)
  } catch (e) {
    push('settings_get_log_level', 'settings.lib: getLogLevel', false, (e as Error)?.message ?? String(e))
  }

  try {
    const rows = await settingsRepo.findAll(ctx)
    push('settings_repo_findAll', 'settings.repo: findAll → массив', Array.isArray(rows))
  } catch (e) {
    push('settings_repo_findAll', 'settings.repo: findAll', false, (e as Error)?.message ?? String(e))
  }

  try {
    await settingsRepo.findByKey(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)
    push('settings_repo_findByKey', 'settings.repo: findByKey(project_name) без исключения', true)
  } catch (e) {
    push('settings_repo_findByKey', 'settings.repo: findByKey', false, (e as Error)?.message ?? String(e))
  }

  try {
    const rows = await logsRepo.findAll(ctx, { limit: 1, offset: 0 })
    push('logs_repo_findAll', 'logs.repo: findAll', Array.isArray(rows))
  } catch (e) {
    push('logs_repo_findAll', 'logs.repo: findAll', false, (e as Error)?.message ?? String(e))
  }

  try {
    const c = await dashboardLib.getDashboardCounts(ctx)
    const ok =
      typeof c.errorCount === 'number' &&
      typeof c.warnCount === 'number' &&
      typeof c.resetAt === 'number'
    push('dashboard_get_counts', 'dashboard.lib: getDashboardCounts', ok)
  } catch (e) {
    push('dashboard_get_counts', 'dashboard.lib: getDashboardCounts', false, (e as Error)?.message ?? String(e))
  }

  try {
    const socketId = loggerLib.getAdminLogsSocketId(ctx)
    push('logger_admin_socket', 'logger.lib: getAdminLogsSocketId(ctx)', typeof socketId === 'string' && socketId.length > 0)
  } catch (e) {
    push('logger_admin_socket', 'logger.lib: getAdminLogsSocketId', false, (e as Error)?.message ?? String(e))
  }

  const passed = results.filter((r) => r.passed).length
  const failed = results.length - passed

  await loggerLib.writeServerLog(ctx, {
    severity: failed ? 5 : 7,
    message: `[${LOG_PATH}] Интеграционный набор завершён`,
    payload: { passed, failed, total: results.length }
  })

  return {
    success: failed === 0,
    kind: 'integration',
    results,
    summary: { passed, failed, total: results.length },
    at: Date.now()
  }
})
