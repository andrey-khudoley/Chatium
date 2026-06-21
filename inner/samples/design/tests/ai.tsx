// @shared-route
import { TEST_CATEGORIES, runTest } from './shared/test-definitions'

export const testsAiRoute = app.get('/', async (ctx) => {
  const results: any[] = []

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

  const passed = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  return {
    summary: { total: results.length, passed, failed },
    results
  }
})
