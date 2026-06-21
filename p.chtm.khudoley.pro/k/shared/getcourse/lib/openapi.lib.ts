// @shared
import { readWorkspaceFile } from '@start/sdk'

/** Метаданные API из OpenAPI info + servers */
export interface ApiInfo {
  title: string
  description: string
  version: string
  serverUrl: string
}

/** Параметр операции (query, path, header) */
export interface ApiParameter {
  name: string
  in: string
  description: string
  required: boolean
  schema: SchemaObject | null
}

/** Свойство схемы (для отображения в UI) */
export interface SchemaProperty {
  name: string
  type: string
  description: string | null
  example: unknown
  nullable: boolean
  enum: string[] | null
  const: unknown
}

/** Нормализованная JSON Schema для UI (один уровень $ref, allOf/oneOf упрощены) */
export interface SchemaObject {
  type: string
  description: string | null
  properties: Record<string, SchemaProperty> | null
  items: SchemaObject | null
  example: unknown
  required: string[]
  enum: string[] | null
  nullable: boolean
  /** Пометка для oneOf: "oneOf (N вариантов)" */
  oneOfLabel?: string
}

/** Ответ операции по статус-коду */
export interface ApiResponse {
  statusCode: string
  description: string
  schema: SchemaObject | null
}

/** Одна операция (path + method) */
export interface ApiOperation {
  path: string
  method: string
  summary: string
  description: string
  operationId: string
  parameters: ApiParameter[]
  requestBody: SchemaObject | null
  responses: ApiResponse[]
  security: string
}

/** Группа операций по тегу */
export interface ApiGroup {
  tag: string
  operations: ApiOperation[]
}

/** Нормализованная документация для UI */
export interface ApiDocs {
  info: ApiInfo
  groups: ApiGroup[]
  schemas: Record<string, SchemaObject>
}

const OPENAPI_FILE_PATHS = [
  'data/openapi-schema.json',
  'p/getcourse_docs/data/openapi-schema.json'
] as const

/** Порядок групп по тегам (план) */
const TAG_ORDER = [
  'Вебхуки',
  'Школа',
  'Заказ',
  'Диалог',
  'Урок',
  'Заметка',
  'Предложение',
  'Пользователь',
  'Вебинары'
]

const EMPTY_DOCS: ApiDocs = {
  info: {
    title: 'Tech API',
    description: '',
    version: '1.0.0',
    serverUrl: ''
  },
  groups: [],
  schemas: {}
}

/**
 * Разрешает $ref вида "#/components/schemas/Name" в SchemaObject (один уровень).
 */
export function resolveRef(ref: string, components: Record<string, unknown> | null): SchemaObject | null {
  if (!ref || !components) return null
  const match = ref.match(/^#\/components\/schemas\/(.+)$/)
  if (!match) return null
  const name = match[1]
  const raw = components.schemas as Record<string, unknown> | undefined
  if (!raw || !(name in raw)) return null
  return parseSchema(raw[name], components) as SchemaObject | null
}

/**
 * Парсит сырую JSON Schema в SchemaObject (обрабатывает $ref, allOf, oneOf, properties, items).
 */
export function parseSchema(raw: unknown, components: Record<string, unknown> | null): SchemaObject | null {
  if (raw == null) return null
  const obj = raw as Record<string, unknown>
  if (typeof obj !== 'object') return null

  if (obj.$ref && typeof obj.$ref === 'string') {
    return resolveRef(obj.$ref, components)
  }

  const type = (obj.type as string) ?? 'object'
  const description = (obj.description as string) ?? null
  const required = Array.isArray(obj.required) ? (obj.required as string[]) : []
  const nullable = Boolean(obj.nullable)
  const example = obj.example
  const enumArr = Array.isArray(obj.enum) ? (obj.enum as string[]) : null

  if (Array.isArray(obj.oneOf) && obj.oneOf.length > 0) {
    const first = parseSchema(obj.oneOf[0], components)
    if (first) {
      first.oneOfLabel = `oneOf (${(obj.oneOf as unknown[]).length} вариантов)`
      return first
    }
  }

  if (Array.isArray(obj.allOf)) {
    const merged: SchemaObject = {
      type: 'object',
      description,
      properties: {},
      items: null,
      example: null,
      required: [],
      enum: null,
      nullable: false
    }
    for (const item of obj.allOf as unknown[]) {
      const sub = parseSchema(item, components)
      if (sub?.properties) {
        Object.assign(merged.properties!, sub.properties)
      }
      if (sub?.required?.length) {
        merged.required = [...(merged.required || []), ...sub.required]
      }
    }
    merged.properties = Object.keys(merged.properties!).length ? merged.properties : null
    return merged
  }

  const properties: Record<string, SchemaProperty> | null = null
  if (obj.properties && typeof obj.properties === 'object') {
    const props = obj.properties as Record<string, Record<string, unknown>>
    const out: Record<string, SchemaProperty> = {}
    for (const [key, val] of Object.entries(props)) {
      const v = val as Record<string, unknown>
      out[key] = {
        name: key,
        type: (v.type as string) ?? 'string',
        description: (v.description as string) ?? null,
        example: v.example,
        nullable: Boolean(v.nullable),
        enum: Array.isArray(v.enum) ? (v.enum as string[]) : null,
        const: v.const
      }
    }
    ;(out as unknown as Record<string, SchemaProperty>)
    return {
      type: 'object',
      description,
      properties: out,
      items: null,
      example,
      required,
      enum: enumArr,
      nullable
    }
  }

  if (obj.items) {
    const items = parseSchema(obj.items, components)
    return {
      type: 'array',
      description,
      properties: null,
      items,
      example,
      required: [],
      enum: null,
      nullable
    }
  }

  return {
    type,
    description,
    properties: null,
    items: null,
    example,
    required: [],
    enum: enumArr,
    nullable
  }
}

/**
 * Извлекает requestBody.content['application/json'].schema и парсит в SchemaObject.
 */
export function parseRequestBody(raw: unknown, components: Record<string, unknown> | null): SchemaObject | null {
  if (raw == null || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  const content = body.content as Record<string, { schema?: unknown }> | undefined
  if (!content?.['application/json']?.schema) return null
  return parseSchema(content['application/json'].schema, components)
}

/**
 * Обходит responses по статус-кодам, для каждого: description + parseSchema из content.
 */
export function parseResponses(raw: unknown, components: Record<string, unknown> | null): ApiResponse[] {
  const out: ApiResponse[] = []
  if (raw == null || typeof raw !== 'object') return out
  const responses = raw as Record<string, Record<string, unknown>>
  for (const [code, resp] of Object.entries(responses)) {
    const desc = (resp.description as string) ?? ''
    let schema: SchemaObject | null = null
    const content = resp.content as Record<string, { schema?: unknown }> | undefined
    if (content?.['application/json']?.schema) {
      schema = parseSchema(content['application/json'].schema, components)
    }
    if (resp.$ref && typeof resp.$ref === 'string') {
      const refMatch = resp.$ref.match(/#\/components\/responses\/(.+)/)
      if (refMatch && components?.responses) {
        const refResp = (components.responses as Record<string, Record<string, unknown>>)[refMatch[1]]
        if (refResp?.content?.['application/json']?.schema) {
          schema = parseSchema((refResp.content as Record<string, { schema?: unknown }>)['application/json'].schema, components)
        }
      }
    }
    out.push({ statusCode: code, description: desc, schema })
  }
  return out
}

/**
 * Нормализует сырой OpenAPI в ApiDocs: info, группы по tags, schemas.
 */
export function normalizeOpenApi(raw: Record<string, unknown> | null | undefined): ApiDocs {
  if (raw == null || typeof raw !== 'object') {
    return EMPTY_DOCS
  }
  const infoBlock = raw.info as Record<string, unknown> | undefined
  const servers = raw.servers as Array<{ url?: string }> | undefined
  const serverUrl = servers?.[0]?.url ?? ''
  const info: ApiInfo = {
    title: (infoBlock?.title as string) ?? 'Tech API',
    description: (infoBlock?.description as string) ?? '',
    version: (infoBlock?.version as string) ?? '1.0.0',
    serverUrl
  }

  const components = (raw.components as Record<string, unknown>) ?? null
  const paths = (raw.paths as Record<string, Record<string, unknown>>) ?? {}
  const tagToOps: Record<string, ApiOperation[]> = {}

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue
    const methods = ['get', 'post', 'put', 'delete', 'patch']
    for (const method of methods) {
      const op = pathItem[method] as Record<string, unknown> | undefined
      if (!op) continue

      const tags = op.tags as string[] | undefined
      const tag = Array.isArray(tags) && tags.length > 0 ? tags[0] : 'Вебхуки'
      if (!tagToOps[tag]) tagToOps[tag] = []

      const parameters: ApiParameter[] = []
      const rawParams = (op.parameters as Array<Record<string, unknown>>) ?? []
      for (const p of rawParams) {
        const schema = p.schema ? parseSchema(p.schema, components) : null
        parameters.push({
          name: (p.name as string) ?? '',
          in: (p.in as string) ?? 'query',
          description: (p.description as string) ?? '',
          required: Boolean(p.required),
          schema
        })
      }

      const requestBody = parseRequestBody(op.requestBody, components)
      const responses = parseResponses(op.responses, components)
      const security = (op.security as Array<Record<string, unknown>>)?.[0]
        ? 'Bearer Token'
        : ''

      tagToOps[tag].push({
        path,
        method: method.toUpperCase(),
        summary: (op.summary as string) ?? '',
        description: (op.description as string) ?? '',
        operationId: (op.operationId as string) ?? '',
        parameters,
        requestBody,
        responses,
        security
      })
    }
  }

  const groups: ApiGroup[] = []
  const seen = new Set<string>()
  for (const tag of TAG_ORDER) {
    if (tagToOps[tag]) {
      seen.add(tag)
      groups.push({ tag, operations: tagToOps[tag] })
    }
  }
  for (const tag of Object.keys(tagToOps)) {
    if (!seen.has(tag)) groups.push({ tag, operations: tagToOps[tag] })
  }

  const schemas: Record<string, SchemaObject> = {}
  const compSchemas = components?.schemas as Record<string, unknown> | undefined
  if (compSchemas) {
    for (const [name, sch] of Object.entries(compSchemas)) {
      const parsed = parseSchema(sch, components)
      if (parsed) schemas[name] = parsed
    }
  }

  return { info, groups, schemas }
}

/**
 * Читает OpenAPI из workspace, парсит JSON и возвращает нормализованную документацию.
 * При ошибке логирует и возвращает пустую структуру.
 */
export async function loadOpenApiSchema(ctx: app.Ctx): Promise<ApiDocs> {
  ctx.account.log('Чтение OpenAPI файла', { level: 'info' })
  let raw: string | null = null
  let lastError: unknown = null
  for (const filePath of OPENAPI_FILE_PATHS) {
    try {
      const content = await readWorkspaceFile(ctx, filePath)
      const str =
        content != null && typeof content === 'object' && 'source' in content
          ? String((content as { source: string }).source ?? '').trim()
          : String(content ?? '').trim()
      if (str.length > 0 && str !== 'null') {
        raw = str
        ctx.account.log('OpenAPI файл прочитан', { level: 'info', json: { path: filePath, length: str.length } })
        break
      }
    } catch (err) {
      lastError = err
      continue
    }
  }
  if (raw == null || raw.trim().length === 0) {
    ctx.account.log('OpenAPI: файл не найден или пуст', { level: 'error', json: { error: String(lastError), triedPaths: OPENAPI_FILE_PATHS } })
    return EMPTY_DOCS
  }
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch (error) {
    ctx.account.log('OpenAPI: ошибка парсинга JSON', { level: 'error', json: { error: String(error) } })
    return EMPTY_DOCS
  }
  if (parsed == null || typeof parsed !== 'object') {
    ctx.account.log('OpenAPI: неверный формат (null или не объект)', { level: 'error', json: { type: typeof parsed } })
    return EMPTY_DOCS
  }
  const docs = normalizeOpenApi(parsed)
  const groupsCount = docs.groups.length
  const endpointsCount = docs.groups.reduce((acc, g) => acc + g.operations.length, 0)
  ctx.account.log('OpenAPI нормализован', { level: 'info', json: { groupsCount, endpointsCount } })
  return docs
}
