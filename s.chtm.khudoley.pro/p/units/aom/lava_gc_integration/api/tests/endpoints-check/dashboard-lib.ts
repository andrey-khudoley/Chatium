// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as dashboardLib from '../../../lib/admin/dashboard.lib'

const LOG_PATH = 'api/tests/endpoints-check/dashboard-lib'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

const DASHBOARD_LIB_TEST_IDS = ['getDashboardCounts', 'resetDashboard'] as const

/**
 * GET /api/tests/endpoints-check/dashboard-lib — тесты библиотеки админки (dashboard.lib).
 * Опционально: query `testId` — выполнить только указанную проверку.
 */
export const dashboardLibTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const testId = typeof req.query?.testId === 'string' ? req.query.testId : undefined
  if (
    testId &&
    !DASHBOARD_LIB_TEST_IDS.includes(testId as (typeof DASHBOARD_LIB_TEST_IDS)[number])
  ) {
    return {
      success: false,
      test: 'dashboard-lib',
      error: `Неизвестный testId: ${testId}`,
      results: [] as TestResult[],
      at: Date.now()
    }
  }
  const shouldRun = (id: string) => !testId || testId === id

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки dashboard.lib`,
    payload: testId ? { testId } : {}
  })

  const results: TestResult[] = []

  if (shouldRun('getDashboardCounts')) {
    try {
      const counts = await dashboardLib.getDashboardCounts(ctx)
      results.push({
        id: 'getDashboardCounts',
        title: 'getDashboardCounts',
        passed:
          typeof counts.errorCount === 'number' &&
          typeof counts.warnCount === 'number' &&
          typeof counts.resetAt === 'number'
      })
    } catch (e) {
      results.push({
        id: 'getDashboardCounts',
        title: 'getDashboardCounts',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  if (shouldRun('resetDashboard')) {
    try {
      const counts = await dashboardLib.resetDashboard(ctx)
      results.push({
        id: 'resetDashboard',
        title: 'resetDashboard',
        passed:
          counts.errorCount === 0 && counts.warnCount === 0 && typeof counts.resetAt === 'number'
      })
    } catch (e) {
      results.push({
        id: 'resetDashboard',
        title: 'resetDashboard',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  return { success: true, test: 'dashboard-lib', results, at: Date.now() }
})
