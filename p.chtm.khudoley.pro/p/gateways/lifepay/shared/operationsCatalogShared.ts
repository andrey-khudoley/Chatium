// @shared
/**
 * Wire-форма каталога операций для UI и SSR-пропсов. Зеркалит типы `OperationSummary` из
 * `lib/gateway/operationsCatalog.ts`, но без зависимости от `@app/schema` (только plain JSON).
 *
 * Этот файл — единственный канал передачи каталога на клиент. Никаких рантайм-валидаторов здесь нет.
 */

export type LpContour = 'bills_v1' | 'ecom_v1'
export type OpAvailability = 'enabled' | 'beta' | 'disabled' | 'unsupported'
export type HttpMethod = 'GET' | 'POST'
export type ArgsFieldType = 'string' | 'number'

export type ArgsFieldSchema = {
  name: string
  type: ArgsFieldType
  required: boolean
  description?: string
}

export type ArgsSchemaJson = {
  fields: ArgsFieldSchema[]
}

/**
 * Полное дерево формата запроса операции, выведенное из рантайм-валидатора (`argsValidator`)
 * на сервере. В отличие от плоского `argsSchema.fields`, раскрывает вложенные объекты/массивы
 * со всеми ключами — используется подсказкой «Формат запроса» на клиенте.
 */
export type ArgsTreeNode =
  | { kind: 'object'; fields: ArgsTreeField[]; additionalProperties: boolean }
  | { kind: 'array'; items: ArgsTreeNode }
  | { kind: 'scalar'; type: string }
  | { kind: 'any' }

export type ArgsTreeField = {
  name: string
  required: boolean
  description?: string
  node: ArgsTreeNode
}

export type OperationSummary = {
  op: string
  httpMethod: HttpMethod
  contour: LpContour
  availability: OpAvailability
  argsSchema: ArgsSchemaJson
  argsTree: ArgsTreeNode
}
