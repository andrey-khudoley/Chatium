// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { runTemplateIntegrationChecks } from '../../../lib/tests/integrationSuite'
import { logTestRunFailures } from '../../../lib/tests/logTestRunFailures'

const LOG_PATH = 'api/tests/integration'

export type TemplateIntegrationTestResult = {
  id: string
  title: string
  passed: boolean
  error?: string
}

/**
 * GET /api/tests/integration — интеграция Heap + либ шаблонного минимума.
 */
export const templateIntegrationTestsRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запуск интеграционного набора`,
    payload: {}
  })

  const results = await runTemplateIntegrationChecks(ctx)

  const meta: TemplateIntegrationTestResult = {
    id: 'api_tests_integration_shape',
    title: 'ответ integration: kind, summary, results',
    passed: false
  }
  try {
    const passed =
      Array.isArray(results) &&
      results.length > 0 &&
      results.every((r) => typeof r.id === 'string' && typeof r.passed === 'boolean')
    meta.passed = passed
  } catch {
    meta.passed = false
    meta.error = 'shape check failed'
  }
  results.push(meta)

  const passedCount = results.filter((r) => r.passed).length
  const failed = results.length - passedCount

  await logTestRunFailures(ctx, LOG_PATH, results)

  await loggerLib.writeServerLog(ctx, {
    severity: failed ? 3 : 7,
    message: `[${LOG_PATH}] Интеграционный набор завершён`,
    payload: { passed: passedCount, failed, total: results.length }
  })

  return {
    success: failed === 0,
    kind: 'integration',
    results,
    summary: { passed: passedCount, failed, total: results.length },
    at: Date.now()
  }
})
