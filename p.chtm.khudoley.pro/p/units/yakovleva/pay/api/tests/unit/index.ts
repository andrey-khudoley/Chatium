// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import {
  runTemplateUnitChecks,
  type TemplateUnitTestResult
} from '../../../lib/tests/templateUnitSuite'
import { runLifepayUnitChecks } from '../../../lib/tests/lifepayUnitSuite'
import { runLavatopUnitChecks } from '../../../lib/tests/lavatopUnitSuite'
import { runPluginManifestUnitChecks } from '../../../lib/tests/pluginManifestUnitSuite'
import { logTestRunFailures } from '../../../lib/tests/logTestRunFailures'

const LOG_PATH = 'api/tests/unit'

export type { TemplateUnitTestResult }

/**
 * GET /api/tests/unit — юнит-проверки шаблонного минимума (без Heap) +
 * юнит-набор LifePay-панели (без Heap и сети).
 */
export const templateUnitTestsRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запуск юнит-набора`,
    payload: {}
  })

  const lifepayResults = await runLifepayUnitChecks()
  const lavatopResults = await runLavatopUnitChecks()
  const pluginResults = await runPluginManifestUnitChecks()
  const knownIds = [
    ...lifepayResults.results.map((r) => r.id),
    ...lavatopResults.results.map((r) => r.id),
    ...pluginResults.map((r) => r.id)
  ]
  const templateResults = runTemplateUnitChecks(knownIds)

  // Объединяем результаты, чтобы сохранить контракт ответа (results[]).
  const results = [
    ...templateResults,
    ...lifepayResults.results,
    ...lavatopResults.results,
    ...pluginResults
  ]
  const passed = results.filter((r) => r.passed).length
  const failed = results.length - passed

  await logTestRunFailures(ctx, LOG_PATH, results)

  await loggerLib.writeServerLog(ctx, {
    severity: failed ? 3 : 7,
    message: `[${LOG_PATH}] Юнит-набор завершён`,
    payload: {
      passed,
      failed,
      total: results.length,
      templateTotal: templateResults.length,
      lifepayTotal: lifepayResults.results.length,
      lavatopTotal: lavatopResults.results.length,
      pluginTotal: pluginResults.length
    }
  })

  return {
    success: failed === 0,
    kind: 'unit',
    results,
    summary: { passed, failed, total: results.length },
    at: Date.now()
  }
})
