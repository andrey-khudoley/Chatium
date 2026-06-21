/**
 * Каталог операций gateway (SSOT). operation-manual §3.1, §3.4, implementation-plan §1.5.
 *
 * Каждая запись содержит:
 *   - `argsValidator` — рантайм-объект `s.object({...})` из `@app/schema` для серверной валидации;
 *   - `argsSchema` — plain JSON-описатель полей для UI-формы (без рантайм-валидатора).
 *
 * Wire-форма `GET /v1/operations` (§3.4) собирается через `toOperationSummary()`: на клиент уходит
 * только `argsSchema`, `argsValidator` остаётся серверным.
 */

// @ts-ignore  системный модуль Chatium, локальных типов нет
import { s } from '@app/schema'

export const CATALOG_SCHEMA_VERSION = 1

export type LpContour = 'bills_v1' | 'ecom_v1'
export type OpAvailability = 'enabled' | 'beta' | 'disabled' | 'unsupported'
export type HttpMethod = 'GET' | 'POST'

/** Тип поля для UI-формы (соответствует `args` валидатора). */
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

/** Дерево формата запроса (зеркалит `shared/operationsCatalogShared.ts`). */
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

export type OperationEntry = {
  op: string
  httpMethod: HttpMethod
  contour: LpContour
  availability: OpAvailability
  argsValidator: {
    safeParse: (
      data: unknown
    ) =>
      | { success: true; data: unknown }
      | { success: false; error: { issues?: Array<{ fullPath?: string; message: string }> } }
  }
  argsSchema: ArgsSchemaJson
}

/** Wire-форма записи каталога для `GET /v1/operations` и SSR-пропсов (без рантайм-валидатора). */
export type OperationSummary = {
  op: string
  httpMethod: HttpMethod
  contour: LpContour
  availability: OpAvailability
  argsSchema: ArgsSchemaJson
  argsTree: ArgsTreeNode
}

const CREATE_BILL_VALIDATOR = s.object({
  amount: s.number(),
  customerEmail: s.string(),
  orderNumber: s.string(),
  callbackUrl: s.string(),
  // description обязателен по контракту LifePay (apidoc.life-pay.ru/bill/index «Описание полей»):
  // отражается в чеке покупателю; отсутствие → LifePay возвращает code 6020.
  description: s.string(),
  customerPhone: s.optional(s.string())
})

const GET_BILL_STATUS_VALIDATOR = s.object({
  billNumber: s.string()
})

const CANCEL_BILL_VALIDATOR = s.object({
  billNumber: s.string()
})

export const operationsCatalog: OperationEntry[] = [
  {
    op: 'createBill',
    httpMethod: 'POST',
    contour: 'bills_v1',
    availability: 'enabled',
    argsValidator: CREATE_BILL_VALIDATOR,
    argsSchema: {
      fields: [
        { name: 'amount', type: 'number', required: true, description: 'Сумма в рублях, > 0' },
        { name: 'customerEmail', type: 'string', required: true, description: 'Email покупателя' },
        {
          name: 'orderNumber',
          type: 'string',
          required: true,
          description: 'Номер заказа на стороне магазина'
        },
        {
          name: 'callbackUrl',
          type: 'string',
          required: true,
          description: 'URL webhook для нотификации платежа'
        },
        {
          name: 'description',
          type: 'string',
          required: true,
          description: 'Описание платежа (отражается в чеке покупателю; обязательно по LifePay)'
        },
        {
          name: 'customerPhone',
          type: 'string',
          required: false,
          description: 'Телефон покупателя (опционально)'
        }
      ]
    }
  },
  {
    op: 'getBillStatus',
    httpMethod: 'GET',
    contour: 'bills_v1',
    availability: 'enabled',
    argsValidator: GET_BILL_STATUS_VALIDATOR,
    argsSchema: {
      fields: [
        {
          name: 'billNumber',
          type: 'string',
          required: true,
          description: 'Идентификатор счёта LifePay (number)'
        }
      ]
    }
  },
  {
    op: 'cancelBill',
    httpMethod: 'POST',
    contour: 'bills_v1',
    availability: 'enabled',
    argsValidator: CANCEL_BILL_VALIDATOR,
    argsSchema: {
      fields: [
        {
          name: 'billNumber',
          type: 'string',
          required: true,
          description: 'Идентификатор счёта LifePay для отмены'
        }
      ]
    }
  }
]

export function findOperation(op: string): OperationEntry | null {
  return operationsCatalog.find((e) => e.op === op) ?? null
}

/**
 * Структурная (JSON-Schema-подобная) проекция рантайм-валидатора `@app/schema`:
 * у `ZType` есть `type`, у `ZObject` — `properties`/`required`/`additionalProperties`,
 * у `ZArray` — `items`. Необязательность = отсутствие имени в `required` родителя.
 */
type RawSchema = {
  type?: string
  properties?: Record<string, RawSchema | undefined>
  required?: string[]
  items?: RawSchema
  additionalProperties?: boolean
  description?: string
}

/** Рекурсивно переводит рантайм-валидатор в сериализуемое дерево формата запроса. */
function schemaToArgsNode(schema: RawSchema | undefined): ArgsTreeNode {
  if (!schema || typeof schema !== 'object') return { kind: 'any' }
  if (schema.type === 'object') {
    const required = new Set(schema.required ?? [])
    const props = schema.properties ?? {}
    const fields: ArgsTreeField[] = Object.keys(props).map((name) => ({
      name,
      required: required.has(name),
      description: props[name]?.description,
      node: schemaToArgsNode(props[name])
    }))
    return { kind: 'object', fields, additionalProperties: schema.additionalProperties !== false }
  }
  if (schema.type === 'array') {
    return { kind: 'array', items: schemaToArgsNode(schema.items) }
  }
  if (
    schema.type === 'string' ||
    schema.type === 'number' ||
    schema.type === 'integer' ||
    schema.type === 'boolean'
  ) {
    return { kind: 'scalar', type: schema.type }
  }
  return { kind: 'any' }
}

/**
 * Дерево формата запроса из `argsValidator` (вся вложенность) с наложением UI-описаний
 * из `argsSchema` на поля верхнего уровня (в валидаторе описаний нет).
 */
function buildArgsTree(validator: unknown, argsSchema: ArgsSchemaJson): ArgsTreeNode {
  const node = schemaToArgsNode(validator as RawSchema)
  if (node.kind === 'object') {
    for (const field of node.fields) {
      if (!field.description) {
        const fromSchema = argsSchema.fields.find((f) => f.name === field.name)?.description
        if (fromSchema) field.description = fromSchema
      }
    }
  }
  return node
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

/** Дополнительная проверка `amount > 0` сверх `s.number()` (схема не выражает > 0 одним типом). */
export function validateCreateBillAmountPositive(args: { amount: number }): boolean {
  return Number.isFinite(args.amount) && args.amount > 0
}
