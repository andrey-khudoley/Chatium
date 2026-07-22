// @shared-route
import { requireAccountRole } from '@app/auth'
import { runAllTests } from '../../lib/tests/run-tests'

/**
 * JSON-эндпоинт для агента/CI (§9.1). «Зелёный» = summary.success === true.
 * Прогон in-process (runAllTests напрямую), не через api/tests/run-tests/run-all.
 * Опциональный query-параметр category — запасной ход при переросте бюджета
 * прогона (фикс-раунда 1, п.16б): прогон одной категории вместо всех шести.
 */
export const brokerTestsAiRoute = app
  .get('/')
  .query((s) => ({ category: s.string().optional() }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    const { summary, results } = await runAllTests(ctx, { category: req.query.category })
    return { project: 'broker', summary, results }
  })
