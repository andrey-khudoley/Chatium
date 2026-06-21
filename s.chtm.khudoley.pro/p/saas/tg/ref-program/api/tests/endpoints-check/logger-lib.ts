// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/logger-lib'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/logger-lib — тесты библиотеки логов (по одной проверке на функцию).
 */
export const loggerLibTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки logger.lib`,
    payload: {}
  })

  const results: TestResult[] = []

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

  return { success: true, test: 'logger-lib', results, at: Date.now() }
})
