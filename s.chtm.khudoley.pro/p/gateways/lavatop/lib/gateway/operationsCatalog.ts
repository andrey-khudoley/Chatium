/**
 * Каталог операций Lava.Top-gateway (SSOT). Каждая запись содержит:
 *   - `argsValidator` — рантайм-объект `s.object({...})` из `@app/schema` для серверной валидации;
 *   - `argsSchema` — plain JSON-описатель полей для UI-формы.
 *
 * Wire-форма `GET /v1/operations` собирается через `toOperationSummaries()`: на клиент уходит
 * только `argsSchema` + выведенное `argsTree`, `argsValidator` остаётся серверным.
 *
 * Контур `invoices_v1` проксирует к Lava.Top:
 *   - createInvoice     → POST  /api/v3/invoice
 *   - getInvoiceStatus  → GET   /api/v2/invoices/{id}
 *   - listProducts      → GET   /api/v2/products
 *   - updateOfferPrice  → PATCH /api/v2/products/{productId}  (метод gateway — POST)
 */

// @ts-ignore  системный модуль Chatium, локальных типов нет
import { s } from '@app/schema'

export const CATALOG_SCHEMA_VERSION = 1

export type LtContour = 'invoices_v1'
export type OpAvailability = 'enabled' | 'beta' | 'disabled' | 'unsupported'
export type HttpMethod = 'GET' | 'POST'

/** Тип поля для UI-формы. */
export type ArgsFieldType = 'string' | 'number' | 'object' | 'array'

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
  contour: LtContour
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

export type OperationSummary = {
  op: string
  httpMethod: HttpMethod
  contour: LtContour
  availability: OpAvailability
  argsSchema: ArgsSchemaJson
  argsTree: ArgsTreeNode
}

const CREATE_INVOICE_VALIDATOR = s.object({
  email: s.string(),
  offerId: s.string(),
  currency: s.string(),
  paymentProvider: s.optional(s.string()),
  paymentMethod: s.optional(s.string()),
  buyerLanguage: s.optional(s.string()),
  periodicity: s.optional(s.string()),
  clientUtm: s.optional(s.any()),
  // callbackUrl/clientOrderId — для маппинга вебхуков; в тело Lava.Top не уходят.
  callbackUrl: s.optional(s.string()),
  clientOrderId: s.optional(s.string())
})

const GET_INVOICE_STATUS_VALIDATOR = s.object({
  id: s.string()
})

const LIST_PRODUCTS_VALIDATOR = s.object({
  nextPage: s.optional(s.string())
})

const UPDATE_OFFER_PRICE_VALIDATOR = s.object({
  productId: s.string(),
  offers: s.array(
    s.object({
      id: s.string(),
      prices: s.array(
        s.object({
          amount: s.number(),
          currency: s.string()
        })
      ),
      name: s.optional(s.string()),
      description: s.optional(s.string())
    })
  )
})

export const operationsCatalog: OperationEntry[] = [
  {
    op: 'createInvoice',
    httpMethod: 'POST',
    contour: 'invoices_v1',
    availability: 'enabled',
    argsValidator: CREATE_INVOICE_VALIDATOR,
    argsSchema: {
      fields: [
        { name: 'email', type: 'string', required: true, description: 'Email покупателя' },
        { name: 'offerId', type: 'string', required: true, description: 'ID оффера Lava.Top' },
        {
          name: 'currency',
          type: 'string',
          required: true,
          description: 'Валюта (RUB, USD, EUR)'
        },
        {
          name: 'paymentProvider',
          type: 'string',
          required: false,
          description: 'Платёжный провайдер (опц.)'
        },
        {
          name: 'paymentMethod',
          type: 'string',
          required: false,
          description: 'Метод оплаты (опц.)'
        },
        {
          name: 'buyerLanguage',
          type: 'string',
          required: false,
          description: 'Язык покупателя (опц.)'
        },
        {
          name: 'periodicity',
          type: 'string',
          required: false,
          description: 'Периодичность подписки (опц.)'
        },
        {
          name: 'clientUtm',
          type: 'object',
          required: false,
          description: 'UTM-метки клиента (опц.)'
        },
        {
          name: 'callbackUrl',
          type: 'string',
          required: false,
          description: 'URL клиентского вебхука для проксирования (опц.); в Lava.Top не передаётся'
        },
        {
          name: 'clientOrderId',
          type: 'string',
          required: false,
          description: 'Идентификатор заказа на стороне клиента (опц.)'
        }
      ]
    }
  },
  {
    op: 'getInvoiceStatus',
    httpMethod: 'GET',
    contour: 'invoices_v1',
    availability: 'enabled',
    argsValidator: GET_INVOICE_STATUS_VALIDATOR,
    argsSchema: {
      fields: [
        { name: 'id', type: 'string', required: true, description: 'contractId/ID счёта Lava.Top' }
      ]
    }
  },
  {
    op: 'listProducts',
    httpMethod: 'GET',
    contour: 'invoices_v1',
    availability: 'enabled',
    argsValidator: LIST_PRODUCTS_VALIDATOR,
    argsSchema: {
      fields: [
        {
          name: 'nextPage',
          type: 'string',
          required: false,
          description: 'URL следующей страницы каталога (из поля nextPage предыдущего ответа)'
        }
      ]
    }
  },
  {
    op: 'updateOfferPrice',
    httpMethod: 'POST',
    contour: 'invoices_v1',
    availability: 'enabled',
    argsValidator: UPDATE_OFFER_PRICE_VALIDATOR,
    argsSchema: {
      fields: [
        { name: 'productId', type: 'string', required: true, description: 'ID продукта Lava.Top' },
        {
          name: 'offers',
          type: 'array',
          required: true,
          description: 'Массив офферов: { id, prices: [{ amount, currency }], name?, description? }'
        }
      ]
    }
  }
]

export function findOperation(op: string): OperationEntry | null {
  return operationsCatalog.find((e) => e.op === op) ?? null
}

/**
 * Структурная (JSON-Schema-подобная) проекция рантайм-валидатора `@app/schema`.
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

/** Дерево формата запроса с наложением UI-описаний из `argsSchema` на поля верхнего уровня. */
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

/** Преобразование каталога в wire-форму (SSR-пропсы, GET /v1/operations). */
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
