// @shared-route
import { runTest } from '../shared/test-definitions'

export const apiRunTestsRoute = app.post('/run', async (ctx, req) => {
  const { category, test } = req.body as { category: string; test: string }
  return await runTest(ctx, category, test)
})
