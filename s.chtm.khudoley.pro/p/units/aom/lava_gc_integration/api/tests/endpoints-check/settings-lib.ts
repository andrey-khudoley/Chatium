// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as settingsLib from '../../../lib/settings.lib'

const LOG_PATH = 'api/tests/endpoints-check/settings-lib'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/settings-lib — тесты библиотеки настроек (по одной проверке на функцию).
 * Возвращает массив results: один элемент на каждую проверяемую функцию.
 * Опционально: query `testId` — выполнить только указанную проверку (id из списка SETTINGS_LIB_TEST_IDS).
 */
const SETTINGS_LIB_TEST_IDS = [
  'getSettingString',
  'getLogLevel',
  'getLogsLimit',
  'getLogWebhook',
  'getDashboardResetAt',
  'getAllSettings'
] as const

export const settingsLibTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const testId = typeof req.query?.testId === 'string' ? req.query.testId : undefined
  if (testId && !SETTINGS_LIB_TEST_IDS.includes(testId as (typeof SETTINGS_LIB_TEST_IDS)[number])) {
    return {
      success: false,
      test: 'settings-lib',
      error: `Неизвестный testId: ${testId}`,
      results: [] as TestResult[],
      at: Date.now()
    }
  }
  const shouldRun = (id: string) => !testId || testId === id

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки settings.lib`,
    payload: testId ? { testId } : {}
  })

  const results: TestResult[] = []

  if (shouldRun('getSettingString')) {
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
  }

  if (shouldRun('getLogLevel')) {
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
  }

  if (shouldRun('getLogsLimit')) {
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
  }

  if (shouldRun('getLogWebhook')) {
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
  }

  if (shouldRun('getDashboardResetAt')) {
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
  }

  if (shouldRun('getAllSettings')) {
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
  }

  return { success: true, test: 'settings-lib', results, at: Date.now() }
})
