/**
 * Каталог операций gateway (SSOT). manual §3.1, §3.4, §3.5.
 *
 * Рукописный статический каталог — без автогенерации (`*.generated`). Каждая запись содержит:
 *   - `argsValidator` — рантайм-объект `s.object({...})` из `@app/schema` для серверной валидации;
 *   - `argsSchema` — plain JSON-описатель полей для UI-формы (`GET /v1/operations`).
 *
 * Wire-форма `GET /v1/operations` собирается через `toOperationSummaries()`: на клиент уходит
 * только `argsSchema`, `argsValidator` остаётся серверным.
 *
 * Записи разнесены по контурам/частям (`operationsCatalogNew1/2`, `operationsCatalogLegacy`),
 * типы и константы — в `operationsCatalogTypes`, построение wire-дерева — в
 * `operationsCatalogSummaries` (вынесено ради лимита размера файла). Здесь — сборка SSOT в
 * исходном порядке и публичные функции поиска/проекции.
 */

import type { OperationSummary } from '../../shared/operationsCatalogShared'
import { type OperationEntry } from './operationsCatalogTypes'
import { operationsCatalogNew1 } from './operationsCatalogNew1'
import { operationsCatalogNew2 } from './operationsCatalogNew2'
import { operationsCatalogLegacy } from './operationsCatalogLegacy'
import { buildArgsTree } from './operationsCatalogSummaries'

export { CATALOG_SCHEMA_VERSION } from './operationsCatalogTypes'
export type { OperationEntry, OperationCatalogEntry } from './operationsCatalogTypes'

export const operationsCatalog: OperationEntry[] = [
  // ─── Контур new ───────────────────────────────────────────────────────────
  ...operationsCatalogNew1,
  ...operationsCatalogNew2,
  // ─── Контур legacy ──────────────────────────────────────────────────────────
  ...operationsCatalogLegacy
]

/** Поиск записи по `op` (manual §3.5: общий источник для роута и каталога). */
export function findOperationCatalogEntry(op: string): OperationEntry | undefined {
  return operationsCatalog.find((e) => e.op === op)
}

/** Алиас `findOperationCatalogEntry` с `null` вместо `undefined` (стиль lifepay). */
export function findOperation(op: string): OperationEntry | null {
  return operationsCatalog.find((e) => e.op === op) ?? null
}

/** Преобразование каталога в wire-форму для клиента (SSR-пропсы, GET /v1/operations). */
export function toOperationSummaries(): OperationSummary[] {
  return operationsCatalog.map((e) => ({
    op: e.op,
    httpMethod: e.httpMethod,
    contour: e.contour,
    availability: e.availability,
    argsSchema: e.argsSchema,
    argsTree: buildArgsTree(e.argsValidator, e.argsSchema)
  }))
}
