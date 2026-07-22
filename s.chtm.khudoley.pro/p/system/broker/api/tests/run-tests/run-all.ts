// @shared-route
import { requireAccountRole } from '@app/auth'
import { runAllTests } from '../../../lib/tests/run-tests'

/**
 * Запуск всего набора (интерактивная страница §9.1). Опциональный category —
 * запасной ход при переросте бюджета прогона (фикс-раунда 1, п.16б): прогон
 * одной категории вместо всех шести.
 */
export const brokerRunAllTestsRoute = app
  .post('/')
  .body((s) => ({ category: s.string().optional() }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    const result = await runAllTests(ctx, { category: req.body.category })
    return { success: true, ...result }
  })
