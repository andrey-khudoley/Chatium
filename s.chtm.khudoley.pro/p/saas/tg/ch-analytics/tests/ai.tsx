// @shared-route
import { requireAnyUser } from '@app/auth'
import { TEST_CATEGORIES } from './shared/test-definitions'
import { runTest } from './api/run-tests'

export const testsAiRoute = app.get('/', async (ctx) => {
  // Защищаем AI страницу тестов авторизацией
  requireAnyUser(ctx)

  const results: any[] = []

  for (const category of TEST_CATEGORIES) {
    for (const test of category.tests) {
      // Используем функцию runTest напрямую (серверный вызов)
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
