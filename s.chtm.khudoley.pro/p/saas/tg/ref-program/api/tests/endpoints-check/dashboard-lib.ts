// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as dashboardLib from '../../../lib/admin/dashboard.lib'

const LOG_PATH = 'api/tests/endpoints-check/dashboard-lib'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/dashboard-lib — тесты библиотеки админки (dashboard.lib).
 */
export const dashboardLibTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки dashboard.lib`,
    payload: {}
  })

  const results: TestResult[] = []

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

  return { success: true, test: 'dashboard-lib', results, at: Date.now() }
})
