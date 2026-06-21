// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/logger-lib'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/logger-lib — тесты библиотеки логов (shouldLogByLevel, writeServerLog).
 */
export const loggerLibTestRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки logger.lib`,
    payload: {}
  })

  const results: TestResult[] = []

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

  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] writeServerLog test`,
      payload: { test: true }
    })
    results.push({ id: 'writeServerLog', title: 'writeServerLog (no throw)', passed: true })
  } catch (e) {
    results.push({
      id: 'writeServerLog',
      title: 'writeServerLog (no throw)',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  return { success: true, test: 'logger-lib', results, at: Date.now() }
})
