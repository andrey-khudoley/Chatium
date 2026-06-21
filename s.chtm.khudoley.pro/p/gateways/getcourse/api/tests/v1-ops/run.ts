// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import {
  runAllV1Ops,
  runSingleV1Op,
  type V1OpsRunSummary
} from '../../../lib/tests/gateway/v1OpsSuiteRunner'

const LOG_PATH = 'api/tests/v1-ops/run'

type RunBody = {
  mode?: 'all' | 'single'
  opId?: string
}

/**
 * POST /api/tests/v1-ops/run — прогон интеграционных сценариев /v1/{op}
 * (gateway-testing-strategy.md §3, §6). Только для роли Admin: цепочки делают
 * реальные исходящие вызовы к GetCourse тестовой школы и наполняют контекст
 * прогона между сценариями.
 *
 * body: { mode: 'all' | 'single', opId?: string }
 */
export const runV1OpsSuiteRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const body = (req.body ?? {}) as RunBody
  const mode: 'all' | 'single' = body.mode === 'single' ? 'single' : 'all'
  const opId = typeof body.opId === 'string' ? body.opId : undefined

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запуск сьюита /v1/{op}`,
    payload: { mode, opId }
  })

  let summary: V1OpsRunSummary
  if (mode === 'single') {
    if (!opId) {
      return { success: false, error: 'mode=single требует opId' }
    }
    summary = await runSingleV1Op(ctx, opId)
  } else {
    summary = await runAllV1Ops(ctx)
  }

  await loggerLib.writeServerLog(ctx, {
    severity: summary.fatalError ? 3 : 6,
    message: `[${LOG_PATH}] Сьюит завершён`,
    payload: {
      mode,
      opId,
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      skipped: summary.skipped,
      durationMs: summary.durationMs,
      fatalError: summary.fatalError
    }
  })

  return {
    success: !summary.fatalError && summary.failed === 0,
    summary,
    at: Date.now()
  }
})
