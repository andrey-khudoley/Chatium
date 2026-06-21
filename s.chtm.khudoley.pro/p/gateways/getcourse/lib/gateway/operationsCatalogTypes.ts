/**
 * Типы и общие константы каталога операций gateway (вынесены из operationsCatalog
 * ради лимита размера файла). Используются группами записей `operationsCatalogNew`
 * и `operationsCatalogLegacy` и барелем `operationsCatalog`.
 */
import type { ZType } from '@app/schema'
import type {
  GcContour,
  HttpMethod,
  OpAvailability,
  ArgsSchemaJson
} from '../../shared/operationsCatalogShared'

/** Версия схемы каталога (manual §3.4). */
export const CATALOG_SCHEMA_VERSION = 1

/** Объекты `additionalProperties: true` — пропускаем неизвестные поля GC (forward-совместимость). */
export const passthrough = { additionalProperties: true } as const

/**
 * Любой рантайм-валидатор `args` (`s.object` или `s.any`).
 * Базовый `ZType<any>` принимает любой конкретный `ZObject<{...}>`/`ZAny<...>`
 * (generic-типы `@app/schema` инвариантны, поэтому `ReturnType<typeof s.object>` не подходит)
 * и предоставляет нужный метод `safeParse`.
 */
export type AnyArgsValidator = ZType<any>

export type OperationEntry = {
  op: string
  contour: GcContour
  httpMethod: HttpMethod
  pathTemplate: string
  availability: OpAvailability
  legacyImportAction: string | null
  argsValidator: AnyArgsValidator
  argsSchema: ArgsSchemaJson
}

/** Алиас имени для обратной совместимости импортов. */
export type OperationCatalogEntry = OperationEntry

export const EMPTY_SCHEMA: ArgsSchemaJson = { fields: [] }
