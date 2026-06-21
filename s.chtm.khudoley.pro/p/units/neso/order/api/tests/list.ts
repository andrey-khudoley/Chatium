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
 * GET /api/tests/list — каталог тестов шаблонного минимума (как p/template_project).
 * Каждая категория содержит `blocks` (функциональные группы) и плоский `tests` для совместимости.
 */
export const listTestsRoute = app.get('/', async (ctx) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос каталога тестов`,
    payload: {}
  })

  const categories = [
    {
      id: 'unit',
      title: 'Юнит-тесты (GET /api/tests/unit)',
      description: 'Синхронные проверки без Heap: logger, routes, project, logLevel',
      blocks: UNIT_TEST_BLOCKS,
      tests: flattenCatalogBlocks(UNIT_TEST_BLOCKS)
    },
    {
      id: 'integration-server',
      title: 'Интеграция сервера (GET /api/tests/integration)',
      description: 'Heap + settings.lib, repos, dashboard.lib',
      blocks: INTEGRATION_SERVER_TEST_BLOCKS,
      tests: flattenCatalogBlocks(INTEGRATION_SERVER_TEST_BLOCKS)
    },
    {
      id: 'integration-http',
      title: 'Интеграция HTTP (страницы шаблона)',
      description:
        'GET маршрутов: /, /web/admin, /web/profile, /web/login, /web/new, /web/t1, /web/t2, /web/tests',
      blocks: [INTEGRATION_HTTP_TEST_BLOCK],
      tests: flattenCatalogBlocks([INTEGRATION_HTTP_TEST_BLOCK])
    }
  ]

  return { success: true, categories, at: Date.now() }
})
