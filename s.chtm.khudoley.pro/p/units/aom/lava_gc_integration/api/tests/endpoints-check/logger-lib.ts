// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/logger-lib'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

const LOGGER_LIB_TEST_IDS = [
  'getAdminLogsSocketId',
  'shouldLogByLevel_Info',
  'shouldLogByLevel_Error',
  'shouldLogByLevel_Disable'
] as const

/**
 * GET /api/tests/endpoints-check/logger-lib — тесты библиотеки логов (по одной проверке на функцию).
 * Опционально: query `testId` — выполнить только указанную проверку.
 */
export const loggerLibTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const testId = typeof req.query?.testId === 'string' ? req.query.testId : undefined
  if (testId && !LOGGER_LIB_TEST_IDS.includes(testId as (typeof LOGGER_LIB_TEST_IDS)[number])) {
    return {
      success: false,
      test: 'logger-lib',
      error: `Неизвестный testId: ${testId}`,
      results: [] as TestResult[],
      at: Date.now()
    }
  }
  const shouldRun = (id: string) => !testId || testId === id

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки logger.lib`,
    payload: testId ? { testId } : {}
  })

  const results: TestResult[] = []

  if (shouldRun('getAdminLogsSocketId')) {
    try {
      const socketId = loggerLib.getAdminLogsSocketId(ctx)
      results.push({
        id: 'getAdminLogsSocketId',
        title: 'getAdminLogsSocketId',
        passed: typeof socketId === 'string' && socketId.length > 0
      })
    } catch (e) {
      results.push({
        id: 'getAdminLogsSocketId',
        title: 'getAdminLogsSocketId',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  if (shouldRun('shouldLogByLevel_Info')) {
    try {
      const ok = loggerLib.shouldLogByLevel('Info', 6)
      results.push({
        id: 'shouldLogByLevel_Info',
        title: 'shouldLogByLevel (Info, 6)',
        passed: ok === true
      })
    } catch (e) {
      results.push({
        id: 'shouldLogByLevel_Info',
        title: 'shouldLogByLevel (Info, 6)',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  if (shouldRun('shouldLogByLevel_Error')) {
    try {
      const ok = loggerLib.shouldLogByLevel('Error', 3)
      results.push({
        id: 'shouldLogByLevel_Error',
        title: 'shouldLogByLevel (Error, 3)',
        passed: ok === true
      })
    } catch (e) {
      results.push({
        id: 'shouldLogByLevel_Error',
        title: 'shouldLogByLevel (Error, 3)',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  if (shouldRun('shouldLogByLevel_Disable')) {
    try {
      const no = loggerLib.shouldLogByLevel('Disable', 7)
      results.push({
        id: 'shouldLogByLevel_Disable',
        title: 'shouldLogByLevel (Disable, 7)',
        passed: no === false
      })
    } catch (e) {
      results.push({
        id: 'shouldLogByLevel_Disable',
        title: 'shouldLogByLevel (Disable, 7)',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  return { success: true, test: 'logger-lib', results, at: Date.now() }
})
