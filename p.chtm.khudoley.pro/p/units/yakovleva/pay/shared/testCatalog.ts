// @shared
/**
 * Каталог тестов Payments Client (синхронизирован с api/tests/unit, integration, HTTP-чеками).
 * Используется в TestsPage (список до запуска) и api/tests/list.
 *
 * Сам каталог разнесён по подмодулям, чтобы каждый файл оставался <400 строк под /check:
 * - юнит-блоки → shared/testCatalogUnit.ts
 * - интеграционные/HTTP-блоки → shared/testCatalogIntegration.ts
 * Здесь оставлены публичные типы, хелперы и re-export всех констант — внешние импорты
 * `from '../../shared/testCatalog'` продолжают работать без изменений.
 */

export type TestCatalogEntry = { id: string; title: string }

export type TestCatalogBlock = {
  id: string
  title: string
  description?: string
  tests: TestCatalogEntry[]
}

export { UNIT_TEST_BLOCKS } from './testCatalogUnit'
export {
  INTEGRATION_SERVER_TEST_BLOCKS,
  INTEGRATION_HTTP_TEST_BLOCK
} from './testCatalogIntegration'

export function flattenCatalogBlocks(blocks: TestCatalogBlock[]): TestCatalogEntry[] {
  return blocks.flatMap((b) => b.tests)
}
