// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'
import {
  UNIT_TEST_BLOCKS,
  INTEGRATION_SERVER_TEST_BLOCKS,
  INTEGRATION_HTTP_TEST_BLOCK,
  flattenCatalogBlocks,
  type TestCatalogBlock
} from '../../shared/testCatalog'
import { operationsCatalog } from '../../lib/gateway/operationsCatalog'

const LOG_PATH = 'api/tests/list'

const GATEWAY_V1_TEST_BLOCK: TestCatalogBlock = {
  id: 'gateway-v1',
  title: 'Gateway /v1/{op}',
  description:
    'По одному прогону на каждый роут api/v1 (gateway-testing-strategy.md §3, §6). Запуск через POST /api/tests/v1-ops/run.',
  tests: operationsCatalog.map((e) => ({
    id: `v1_${e.op}`,
    title: `${e.httpMethod} /v1/${e.op} · ${e.contour}/${e.availability}`
  }))
}

/**
 * GET /api/tests/list — каталог тестов (каркас на базе template_project).
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
    },
    {
      id: 'gateway-v1',
      title: 'Gateway /v1/{op} (POST /api/tests/v1-ops/run)',
      description:
        'Реальные исходящие вызовы к GetCourse тестовой школы. Один тест на каждый из 59 роутов api/v1, фазовый порядок и контекст по docs/gateway/gateway-testing-strategy.md.',
      blocks: [GATEWAY_V1_TEST_BLOCK],
      tests: flattenCatalogBlocks([GATEWAY_V1_TEST_BLOCK])
    }
  ]

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] listTestsRoute exit`,
    payload: { categoriesCount: categories.length }
  })

  return { success: true, categories, at: Date.now() }
})
