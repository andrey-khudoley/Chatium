// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { apiLoggingGetLevelRoute } from '../../../api/logging/get-level'
import { LOG_LEVELS } from '../../../lib/logger-settings.lib'

const LOG_PATH = 'api/tests/endpoints-check/logging-get-level'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/logging-get-level — тест GET уровня логирования.
 */
export const loggingGetLevelTestRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки get-level`,
    payload: {}
  })

  const results: TestResult[] = []

  try {
    const res = await apiLoggingGetLevelRoute.run(ctx)
    const level = res?.level
    const valid = typeof level === 'string' && (LOG_LEVELS as readonly string[]).includes(level)
    results.push({
      id: 'get_level_valid',
      title: 'get-level returns valid level',
      passed: valid,
      error: valid ? undefined : `level="${level}" not in LOG_LEVELS`
    })
  } catch (e) {
    results.push({
      id: 'get_level_valid',
      title: 'get-level returns valid level',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  return { success: true, test: 'logging-get-level', results, at: Date.now() }
})
