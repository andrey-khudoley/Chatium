// @shared-route
import { requireAccountRole } from '@app/auth'
import { TEST_CATEGORIES } from '../../../shared/tests/test-definitions'

/** Список категорий/тестов — единый источник истины с shared/tests/test-definitions.ts. */
export const brokerTestsListRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')
  return { success: true, categories: TEST_CATEGORIES }
})
