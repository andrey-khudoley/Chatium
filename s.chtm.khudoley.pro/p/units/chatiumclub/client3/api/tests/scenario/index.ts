// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import {
  runPaymentReactionUnitChecks,
  type PaymentReactionUnitTestResult
} from '../../../lib/tests/paymentReactionSuite'
import { logTestRunFailures } from '../../../lib/tests/logTestRunFailures'

const LOG_PATH = 'api/tests/scenario'

export type { PaymentReactionUnitTestResult }

/**
 * GET /api/tests/scenario — юнит-набор сценария C (оплата → реакция Леночки).
 * Проверяет нормализацию события GC, безопасное сравнение токенов и подстановку шаблона.
 */
export const scenarioUnitTestsRoute = app.get('/', async (ctx) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запуск сценарного юнит-набора (payment reaction)`,
    payload: {}
  })

  const results = runPaymentReactionUnitChecks()
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
