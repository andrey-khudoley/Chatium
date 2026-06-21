// @shared-route
import { requireAnyUser } from '@app/auth'
import { TEST_CATEGORIES } from './shared/test-definitions'
import { runTest } from './api/run-tests'
import '../lib/logs-init'

export const testsAiRoute = app.get('/', async (ctx) => {
  requireAnyUser(ctx)

  const results: Array<{
    category: string
    test: string
    description: string
    success: boolean
    message: string
  }> = []

  for (const category of TEST_CATEGORIES) {
    for (const test of category.tests) {
      const result = await runTest(ctx, category.name, test.name)
      results.push({
        category: category.name,
        test: test.name,
        description: test.description,
        ...result
      })
    }
  }

  const passed = results.filter((item) => item.success).length
  const failed = results.filter((item) => !item.success).length

  return {
    summary: { total: results.length, passed, failed },
    results
  }
})
