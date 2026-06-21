// @shared
// Чистая (без Vue) логика вкладки «Создать запрос»: подсказка формата из дерева `argsTree`,
// сборка/валидация плоского тела (`argsSchema.fields`), форматирование снапшотов и fetch к `/v1/{op}`.
// Вынесено из SFC ради компактности (001-standards §«KEEP FILES SMALL»); функции работают с plain-данными.

import type { ArgsFieldSchema, ArgsTreeNode, ArgsTreeField } from './operationsCatalogShared'

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
// У LifePay плоская форма: ввод по списку `argsSchema.fields` (типы string/number).
export function isEmailField(name: string): boolean {
  return /email/i.test(name)
}

export function isSecretField(name: string): boolean {
  return /key|secret|password|token|apikey/i.test(name)
}

// ── Валидация ─────────────────────────────────────────────────────────────────
const LP_LOGIN_RE = /^7[0-9]{10}$/

export function validateLogin(value: string): string {
  const v = value.trim()
  if (!v) return 'Заголовок X-Lp-Login обязателен.'
  if (!LP_LOGIN_RE.test(v)) return 'X-Lp-Login: 11 цифр, начинается с 7, без префикса +.'
  return ''
}

export function validateApikey(value: string): string {
  if (!value.trim()) return 'Заголовок X-Lp-Apikey обязателен.'
  return ''
}

export function validateArgField(field: ArgsFieldSchema, raw: string): string {
  const trimmed = (raw ?? '').trim()
  if (field.required && trimmed === '') return `Поле «${field.name}» обязательно.`
  if (trimmed === '') return ''
  if (field.type === 'number') {
    const n = Number(trimmed)
    if (!Number.isFinite(n)) return `Поле «${field.name}»: ожидается число.`
  }
  return ''
}

/** Карта ошибок по ключам: обязательные заголовки X-Lp-Apikey/X-Lp-Login + per-field валидация полей. */
export function buildFieldErrors(
  argsFields: ArgsFieldSchema[],
  argsValues: Record<string, string>,
  apikey: string,
  login: string
): Record<string, string> {
  const errs: Record<string, string> = {}
  errs['X-Lp-Apikey'] = validateApikey(apikey)
  errs['X-Lp-Login'] = validateLogin(login)
  for (const field of argsFields) {
    const err = validateArgField(field, argsValues[field.name] ?? '')
    if (err) errs[field.name] = err
  }
  return errs
}

// ── Сборка тела запроса ───────────────────────────────────────────────────────
export function buildArgsObject(
  argsFields: ArgsFieldSchema[],
  argsValues: Record<string, string>
): Record<string, string | number> {
  const result: Record<string, string | number> = {}
  for (const field of argsFields) {
    const raw = (argsValues[field.name] ?? '').trim()
    if (raw === '') continue
    result[field.name] = field.type === 'number' ? Number(raw) : raw
  }
  return result
}

/** Строит URL/тело/query для запроса к `/{projectRoot}/api/v1/{op}`. */
export function buildUrlAndBody(
  httpMethod: string,
  op: string,
  argsObj: Record<string, string | number>,
  projectRoot: string
): { url: string; body: string | null; query: Record<string, string> | null } {
  // Ведущий «/» — часть литерала; projectRoot без слеша.
  let url = `/${projectRoot}/api/v1/${op}`
  if (httpMethod === 'GET') {
    const params = new URLSearchParams()
    const query: Record<string, string> = {}
    for (const [k, v] of Object.entries(argsObj)) {
      const s = String(v)
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
