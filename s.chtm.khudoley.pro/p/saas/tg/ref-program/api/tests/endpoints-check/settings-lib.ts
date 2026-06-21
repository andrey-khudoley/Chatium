// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as settingsLib from '../../../lib/settings.lib'

const LOG_PATH = 'api/tests/endpoints-check/settings-lib'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/settings-lib — тесты библиотеки настроек (по одной проверке на функцию).
 * Возвращает массив results: один элемент на каждую проверяемую функцию.
 */
export const settingsLibTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки settings.lib`,
    payload: {}
  })

  const results: TestResult[] = []

  try {
    const projectName = await settingsLib.getSettingString(
      ctx,
      settingsLib.SETTING_KEYS.PROJECT_NAME
    )
    results.push({
      id: 'getSettingString',
      title: 'getSettingString (project_name)',
      passed: typeof projectName === 'string'
    })
  } catch (e) {
    results.push({
      id: 'getSettingString',
      title: 'getSettingString (project_name)',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const logLevel = await settingsLib.getLogLevel(ctx)
    const valid = typeof logLevel === 'string' && settingsLib.LOG_LEVELS.includes(logLevel as any)
    results.push({
      id: 'getLogLevel',
      title: 'getLogLevel',
      passed: valid
    })
  } catch (e) {
    results.push({
      id: 'getLogLevel',
      title: 'getLogLevel',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const logsLimit = await settingsLib.getLogsLimit(ctx)
    results.push({
      id: 'getLogsLimit',
      title: 'getLogsLimit',
      passed: typeof logsLimit === 'number' && logsLimit >= 1 && logsLimit <= 10000
    })
  } catch (e) {
    results.push({
      id: 'getLogsLimit',
      title: 'getLogsLimit',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const webhook = await settingsLib.getLogWebhook(ctx)
    results.push({
      id: 'getLogWebhook',
      title: 'getLogWebhook',
      passed:
        typeof webhook === 'object' &&
        webhook !== null &&
        typeof (webhook as any).enable === 'boolean' &&
        typeof (webhook as any).url === 'string'
    })
  } catch (e) {
    results.push({
      id: 'getLogWebhook',
      title: 'getLogWebhook',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const resetAt = await settingsLib.getDashboardResetAt(ctx)
    results.push({
      id: 'getDashboardResetAt',
      title: 'getDashboardResetAt',
      passed: typeof resetAt === 'number' && resetAt >= 0
    })
  } catch (e) {
    results.push({
      id: 'getDashboardResetAt',
      title: 'getDashboardResetAt',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const all = await settingsLib.getAllSettings(ctx)
    results.push({
      id: 'getAllSettings',
      title: 'getAllSettings',
      passed: typeof all === 'object' && all !== null && !Array.isArray(all)
    })
  } catch (e) {
    results.push({
      id: 'getAllSettings',
      title: 'getAllSettings',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  return { success: true, test: 'settings-lib', results, at: Date.now() }
})
