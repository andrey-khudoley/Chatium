// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'
import {
  UNIT_TEST_BLOCKS,
  INTEGRATION_SERVER_TEST_BLOCKS,
  INTEGRATION_HTTP_TEST_BLOCK,
  flattenCatalogBlocks
} from '../../shared/testCatalog'

const LOG_PATH = 'api/tests/list'

/**
 * GET /api/tests/list — каталог тестов; проект `p/units/chatiumclub/client4` (сценарий registration-welcome).
 * Каждая категория содержит `blocks` (функциональные группы) и плоский `tests` для совместимости.
 */
export const listTestsRoute = app.get('/', async (ctx) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос каталога тестов`,
    payload: {}
  })

  const categories = [
    {
      id: 'unit',
      title: 'Юнит-тесты (GET /api/tests/unit)',
      description:
        'Синхронные проверки без Heap (lib/tests/templateUnitSuite): routes, project, logLevel script, logger.lib, shared/logger, каталог',
      blocks: UNIT_TEST_BLOCKS,
      tests: flattenCatalogBlocks(UNIT_TEST_BLOCKS)
    },
    {
      id: 'integration-server',
      title: 'Интеграция сервера (GET /api/tests/integration)',
      description:
        'Heap + libs + API route.run + e2e (lib/tests/integrationSuite); часть кейсов требует роль Admin',
      blocks: INTEGRATION_SERVER_TEST_BLOCKS,
      tests: flattenCatalogBlocks(INTEGRATION_SERVER_TEST_BLOCKS)
    },
    {
      id: 'integration-http',
      title: 'Интеграция HTTP (страницы шаблона)',
      description: 'GET /, /web/* — статус и фрагменты SSR (страница /web/tests)',
      blocks: [INTEGRATION_HTTP_TEST_BLOCK],
      tests: flattenCatalogBlocks([INTEGRATION_HTTP_TEST_BLOCK])
    }
  ]

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] listTestsRoute exit`,
    payload: { categoriesCount: categories.length }
  })

  return { success: true, categories, at: Date.now() }
})
