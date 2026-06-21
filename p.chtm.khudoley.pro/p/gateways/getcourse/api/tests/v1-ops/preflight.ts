// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { buildV1OpsPreflight } from '../../../lib/tests/gateway/v1OpsPreflight'

const LOG_PATH = 'api/tests/v1-ops/preflight'

/**
 * GET /api/tests/v1-ops/preflight — статичный анализ готовности сьюита /v1/{op}
 * (gateway-testing-strategy.md §1, §9). Без вызовов GetCourse.
 *
 * Только Admin: возвращает имена `gc_itest_*` Heap-ключей и состояние «уровня A»;
 * сами секреты не отдаются (manual §5.7).
 */
export const v1OpsPreflightRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] preflight entry`,
    payload: {}
  })

  const snapshot = await buildV1OpsPreflight(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] preflight ready`,
    payload: {
      levelAReady: snapshot.levelA.ready,
      summary: snapshot.summary
    }
  })

  return { success: true, snapshot, at: Date.now() }
})
