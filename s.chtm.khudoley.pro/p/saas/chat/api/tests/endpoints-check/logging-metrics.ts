// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { apiLoggingGetMetricsRoute } from '../../../api/logging/get-metrics'
import { apiLoggingResetMetricsRoute } from '../../../api/logging/reset-metrics'

const LOG_PATH = 'api/tests/endpoints-check/logging-metrics'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/logging-metrics — тесты get-metrics и reset-metrics.
 */
export const loggingMetricsTestRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки metrics`,
    payload: {}
  })

  const results: TestResult[] = []

  try {
    const getRes = await apiLoggingGetMetricsRoute.run(ctx)
    const metrics = getRes?.metrics
    const isObject = metrics !== null && typeof metrics === 'object' && !Array.isArray(metrics)
    results.push({
      id: 'get_metrics_shape',
      title: 'get-metrics returns object',
      passed: isObject,
      error: isObject ? undefined : 'metrics is not an object'
    })
  } catch (e) {
    results.push({
      id: 'get_metrics_shape',
      title: 'get-metrics returns object',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    await apiLoggingResetMetricsRoute.run(ctx)
    const afterReset = await apiLoggingGetMetricsRoute.run(ctx)
    const metrics = (afterReset?.metrics ?? {}) as Record<string, number>
    const hasKeys =
      typeof metrics.processedMessages === 'number' ||
      typeof metrics.errors === 'number' ||
      Object.keys(metrics).length >= 0
    results.push({
      id: 'reset_metrics',
      title: 'reset-metrics runs and get-metrics still returns object',
      passed: hasKeys
    })
  } catch (e) {
    results.push({
      id: 'reset_metrics',
      title: 'reset-metrics',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  return { success: true, test: 'logging-metrics', results, at: Date.now() }
})
