// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { runLeadUnitChecks, type LeadUnitTestResult } from '../../../lib/tests/leadFlowSuite'
import { logTestRunFailures } from '../../../lib/tests/logTestRunFailures'

const LOG_PATH = 'api/tests/scenario'

export type { LeadUnitTestResult }

/**
 * GET /api/tests/scenario — юнит-набор сценария A (лид с лендинга).
 * Проверяет валидацию формы и сборку args для invoke('addUser')/invoke('createDeal').
 *
 * Возвращает `{ success, kind: 'scenario', results, summary, at }` —
 * совместимо с форматом ответа `/api/tests/unit` шаблона.
 */
export const scenarioUnitTestsRoute = app.get('/', async (ctx) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запуск сценарного юнит-набора (lead flow)`,
    payload: {}
  })

  const results = runLeadUnitChecks()
  const passed = results.filter((r) => r.passed).length
  const failed = results.length - passed

  await logTestRunFailures(ctx, LOG_PATH, results)

  await loggerLib.writeServerLog(ctx, {
    severity: failed ? 3 : 7,
    message: `[${LOG_PATH}] Сценарный юнит-набор завершён`,
    payload: { passed, failed, total: results.length }
  })

  return {
    success: failed === 0,
    kind: 'scenario',
    results,
    summary: { passed, failed, total: results.length },
    at: Date.now()
  }
})
