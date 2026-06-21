// @shared
// Чистая (без Vue) логика вкладки «Создать запрос»: модель формы из дерева `argsTree`,
// сборка/валидация тела, форматирование снапшотов и fetch к `/v1/{op}`. Вынесено из SFC
// ради компактности (001-standards §«KEEP FILES SMALL»); функции работают с plain-данными.

import type { ArgsTreeNode, ArgsTreeField } from './operationsCatalogShared'

// ── Снапшоты запроса/ответа ──────────────────────────────────────────────────
export type RequestSnapshot = {
  method: string
  url: string
  headers: Record<string, string>
  body: string | null
  query: Record<string, string> | null
}

export type ResponseSnapshot = {
  statusCode: number
  headers: Record<string, string>
  body: string
  parsedBody: unknown
}

// ── Подсказка «Формат запроса»: легенда и пример ─────────────────────────────
export type LegendRow = {
  path: string
  depth: number
  type: string
  required: boolean
  description?: string
}

export function scalarPlaceholder(type: string): unknown {
  if (type === 'number' || type === 'integer') return 0
  if (type === 'boolean') return true
  return 'string'
}

export function nodeTypeLabel(node: ArgsTreeNode): string {
  if (node.kind === 'object') return 'object'
  if (node.kind === 'array') return `${nodeTypeLabel(node.items)}[]`
  if (node.kind === 'scalar') return node.type
  return 'any'
}

export function exampleValueForNode(node: ArgsTreeNode): unknown {
  if (node.kind === 'object') {
    const obj: Record<string, unknown> = {}
    for (const f of node.fields) obj[f.name] = exampleValueForNode(f.node)
    return obj
  }
  if (node.kind === 'array') return [exampleValueForNode(node.items)]
  if (node.kind === 'scalar') return scalarPlaceholder(node.type)
  return {}
}

function collectRows(field: ArgsTreeField, parentPath: string, depth: number, rows: LegendRow[]) {
  const path = parentPath ? `${parentPath}.${field.name}` : field.name
  rows.push({
    path,
    depth,
    type: nodeTypeLabel(field.node),
    required: field.required,
    description: field.description
  })
  if (field.node.kind === 'object') {
    for (const f of field.node.fields) collectRows(f, path, depth + 1, rows)
  } else if (field.node.kind === 'array' && field.node.items.kind === 'object') {
    for (const f of field.node.items.fields) collectRows(f, `${path}[]`, depth + 1, rows)
  }
}

/** Плоская легенда всех полей запроса (с вложенными, через точечные пути). */
export function buildLegendRows(tree: ArgsTreeNode | null): LegendRow[] {
  if (!tree || tree.kind !== 'object') return []
  const rows: LegendRow[] = []
  for (const f of tree.fields) collectRows(f, '', 0, rows)
  return rows
}

/** Пример запроса со всеми ключами (обязательными и опциональными). */
export function buildExampleRequest(httpMethod: string, tree: ArgsTreeNode | null): string {
  if (!tree) return ''
  if (httpMethod === 'GET') {
    if (tree.kind !== 'object' || tree.fields.length === 0) return '(без параметров)'
    return '?' + tree.fields.map((f) => `${f.name}=<${nodeTypeLabel(f.node)}>`).join('&')
  }
  return JSON.stringify(exampleValueForNode(tree), null, 2)
}

// ── Форма по полям ──────────────────────────────────────────────────────────
// Дерево аргументов разворачивается в плоский список строк формы: объекты с известными
// ключами становятся группами-заголовками (с отступом), а каждый скаляр получает своё поле
// ввода. Массивы / any / объекты без выведенных полей редактируются как «сырой» JSON.
export type LeafInput = 'string' | 'number' | 'boolean' | 'json'

export type FormGroup = {
  kind: 'group'
  path: string
  name: string
  depth: number
  required: boolean
  description?: string
}
export type FormLeaf = {
  kind: 'leaf'
  path: string
  name: string
  depth: number
  inputType: LeafInput
  typeLabel: string
  required: boolean
  description?: string
}
export type FormRow = FormGroup | FormLeaf

function scalarInputType(type: string): LeafInput {
  if (type === 'number' || type === 'integer') return 'number'
  if (type === 'boolean') return 'boolean'
  return 'string'
}

// `ancestorsRequired` — все ли объекты-предки обязательны. Поле считается обязательным только
// когда обязателен весь путь до него: required-лист внутри опционального объекта не блокирует форму.
function walkArgsField(
  field: ArgsTreeField,
  parentPath: string,
  depth: number,
  ancestorsRequired: boolean,
  rows: FormRow[]
) {
  const path = parentPath ? `${parentPath}.${field.name}` : field.name
  const node = field.node
  const required = field.required && ancestorsRequired
  if (node.kind === 'object' && node.fields.length > 0) {
    rows.push({
      kind: 'group',
      path,
      name: field.name,
      depth,
      required,
      description: field.description
    })
    for (const child of node.fields) walkArgsField(child, path, depth + 1, required, rows)
    return
  }
  const inputType: LeafInput = node.kind === 'scalar' ? scalarInputType(node.type) : 'json'
  rows.push({
    kind: 'leaf',
    path,
    name: field.name,
    depth,
    inputType,
    typeLabel: nodeTypeLabel(node),
    required,
    description: field.description
  })
}

export function buildFormRows(tree: ArgsTreeNode | null): FormRow[] {
  if (!tree || tree.kind !== 'object') return []
  const rows: FormRow[] = []
  for (const f of tree.fields) walkArgsField(f, '', 0, true, rows)
  return rows
}

export function isEmailField(name: string): boolean {
  return /email/i.test(name)
}

export function isSecretField(name: string): boolean {
  return /key|secret|password|token|apikey/i.test(name)
}

export function jsonPlaceholder(typeLabel: string): string {
  return typeLabel.endsWith('[]') ? '[ ... ]' : '{ ... }'
}

// ── Валидация ─────────────────────────────────────────────────────────────────
export function validateLeaf(row: FormLeaf, raw: string): string {
  const trimmed = (raw ?? '').trim()
  if (row.required && trimmed === '') return `Поле «${row.path}» обязательно.`
  if (trimmed === '') return ''
  if (row.inputType === 'number' && !Number.isFinite(Number(trimmed)))
    return `Поле «${row.path}»: ожидается число.`
  if (row.inputType === 'boolean' && trimmed !== 'true' && trimmed !== 'false')
    return `Поле «${row.path}»: ожидается true/false.`
  if (row.inputType === 'json') {
    try {
      JSON.parse(trimmed)
    } catch {
      return `Поле «${row.path}»: ожидается корректный JSON.`
    }
  }
  return ''
}

/** Карта ошибок по ключам: обязательные заголовки + per-field валидация листьев. */
export function buildFieldErrors(
  formRows: FormRow[],
  argsValues: Record<string, string>,
  requiredHeaders: { name: string; value: string }[]
): Record<string, string> {
  const errs: Record<string, string> = {}
  for (const h of requiredHeaders) {
    if (!h.value.trim()) errs[h.name] = `Заголовок ${h.name} обязателен.`
  }
  for (const row of formRows) {
    if (row.kind !== 'leaf') continue
    const err = validateLeaf(row, argsValues[row.path] ?? '')
    if (err) errs[row.path] = err
  }
  return errs
}

// ── Сборка тела запроса ───────────────────────────────────────────────────────
/** Гарантирует наличие вложенного объекта по точечному пути (создаёт недостающие звенья). */
function ensurePath(target: Record<string, unknown>, path: string) {
  for (const key of path.split('.')) {
    const next = target[key]
    if (typeof next !== 'object' || next === null || Array.isArray(next)) target[key] = {}
    target = target[key] as Record<string, unknown>
  }
}

/** Записывает значение по точечному пути, создавая промежуточные объекты. */
function setByPath(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.')
  const last = parts.pop()
  if (last === undefined) return
  let cur = target
  for (const key of parts) {
    const next = cur[key]
    if (typeof next !== 'object' || next === null || Array.isArray(next)) cur[key] = {}
    cur = cur[key] as Record<string, unknown>
  }
  cur[last] = value
}

export function buildArgsObject(
  formRows: FormRow[],
  argsValues: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  // 1) Обязательные объекты-группы должны присутствовать в теле, даже если все их поля
  //    опциональны и пусты (иначе серверный валидатор отвергнет запрос как «нет объекта»).
  for (const row of formRows) {
    if (row.kind === 'group' && row.required) ensurePath(result, row.path)
  }
  // 2) Значения заполненных листьев. Пустые поля пропускаем (опциональные не отправляются).
  for (const row of formRows) {
    if (row.kind !== 'leaf') continue
    const raw = (argsValues[row.path] ?? '').trim()
    if (raw === '') continue
    let value: unknown
    if (row.inputType === 'number') {
      value = Number(raw)
    } else if (row.inputType === 'boolean') {
      value = raw === 'true'
    } else if (row.inputType === 'json') {
      try {
        value = JSON.parse(raw)
      } catch {
        // Невалидный JSON отсекается валидацией до отправки; на всякий случай пропускаем.
        continue
      }
    } else {
      value = raw
    }
    setByPath(result, row.path, value)
  }
  return result
}

/** Строит URL/тело/query для запроса к `/{projectRoot}/api/v1/{op}`. */
export function buildUrlAndBody(
  httpMethod: string,
  op: string,
  argsObj: Record<string, unknown>,
  projectRoot: string
): { url: string; body: string | null; query: Record<string, string> | null } {
  // Ведущий «/» — часть литерала; projectRoot без слеша.
  let url = `/${projectRoot}/api/v1/${op}`
  if (httpMethod === 'GET') {
    const params = new URLSearchParams()
    const query: Record<string, string> = {}
    for (const [k, v] of Object.entries(argsObj)) {
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
      params.set(k, s)
      query[k] = s
    }
    const queryString = params.toString()
    if (queryString) url += `?${queryString}`
    return { url, body: null, query }
  }
  return { url, body: JSON.stringify(argsObj), query: null }
}

// ── Выполнение запроса ──────────────────────────────────────────────────────
export type GatewayRequestResult =
  | { ok: true; snapshot: ResponseSnapshot; responseOk: boolean }
  | { ok: false; error: string }

export async function runGatewayRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | null,
  timeoutMs: number
): Promise<GatewayRequestResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method, headers, body, signal: controller.signal })
    const text = await res.text()
    const respHeaders: Record<string, string> = {}
    res.headers.forEach((value, key) => {
      respHeaders[key] = value
    })
    let parsedBody: unknown = text
    try {
      parsedBody = JSON.parse(text)
    } catch {
      parsedBody = text
    }
    const okFromBody =
      parsedBody !== null &&
      typeof parsedBody === 'object' &&
      'ok' in (parsedBody as Record<string, unknown>)
        ? Boolean((parsedBody as { ok?: boolean }).ok)
        : null
    const responseOk = okFromBody !== null ? okFromBody : res.status >= 200 && res.status < 300
    return {
      ok: true,
      snapshot: { statusCode: res.status, headers: respHeaders, body: text, parsedBody },
      responseOk
    }
  } catch (e) {
    const error =
      e instanceof DOMException && e.name === 'AbortError'
        ? `Таймаут запроса (${timeoutMs / 1000} с) — gateway не ответил.`
        : `Ошибка fetch: ${String(e)}`
    return { ok: false, error }
  } finally {
    clearTimeout(timeoutId)
  }
}

// ── Форматирование снапшотов для вывода ───────────────────────────────────────
export function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function requestHeadersJson(snap: RequestSnapshot | null): string {
  if (!snap) return ''
  const { method, url, headers } = snap
  return formatJson({ method, url, headers })
}

export function requestBodyJson(snap: RequestSnapshot | null): string {
  if (!snap) return ''
  const { body, query } = snap
  if (query !== null) return formatJson(query)
  if (body !== null) {
    try {
      return formatJson(JSON.parse(body))
    } catch {
      return body
    }
  }
  return '(тело запроса пустое)'
}

/** «Ответ вышестоящего сервиса» — содержимое поля data/error из тела ответа гейтвея. */
export function upstreamSnapshotJson(snap: ResponseSnapshot | null): string {
  if (!snap) return ''
  const pb = snap.parsedBody
  if (pb && typeof pb === 'object') {
    const obj = pb as Record<string, unknown>
    if ('ok' in obj) {
      if (obj.ok === true) {
        return 'data' in obj ? formatJson(obj.data) : '(в ответе гейтвея нет поля data)'
      }
      return 'error' in obj ? formatJson(obj.error) : '(в ответе гейтвея нет поля error)'
    }
  }
  return '(не удалось выделить ответ вышестоящего сервиса из тела ответа)'
}

/** «Ответ гейтвея» — полная HTTP-обёртка ответа /v1/{op}. */
export function gatewaySnapshotJson(snap: ResponseSnapshot | null): string {
  if (!snap) return ''
  const { statusCode, headers, parsedBody } = snap
  return formatJson({ statusCode, headers, body: parsedBody })
}
