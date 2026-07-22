// @shared-route
import { requireAccountRole } from '@app/auth'
import { runSingleTest } from '../../../lib/tests/run-tests'

/** Запуск одного теста по category/test (интерактивная страница §9.1). */
export const brokerRunSingleTestRoute = app
  .post('/')
  .body((s) => ({
    category: s.string(),
    test: s.string()
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    const result = await runSingleTest(ctx, req.body.category, req.body.test)
    return { success: true, result }
  })
