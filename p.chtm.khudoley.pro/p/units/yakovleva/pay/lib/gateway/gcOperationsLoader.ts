/**
 * SSR-загрузчик каталога enabled-операций GC.
 *
 * `GET /v1/operations` GC-гейтвея отдаёт весь каталог; здесь фильтрация
 * `availability === 'enabled'` происходит на стороне клиентского SSR. Это
 * позволяет включать/выключать операции в самом гейтвее без правок клиента.
 *
 * Эндпоинт каталога не требует заголовков школы.
 * Graceful degradation: при отключённом флаге `gc_enabled`, битом URL override
 * или сетевой ошибке — возвращается пустой массив, страница рендерится без
 * GC-группы в дропдауне.
 */

import { request } from '@app/request'

import { INVOKE_TIMEOUT_MS } from './constants'
import { GATEWAY_API_PREFIX } from '../../config/gatewayUrls'
import * as settingsLib from '../settings.lib'
import * as loggerLib from '../logger.lib'
import type { GcOperationEntry, GcOperationField } from '../../shared/operationsClientCatalog'
import type { ArgsTreeNode } from '../../shared/gcArgsForm'

const LOG_MODULE = 'lib/gateway/gcOperationsLoader'

type RawArgsField = {
  name?: unknown
  type?: unknown
  required?: unknown
  description?: unknown
}

type RawOperationSummary = {
  op?: unknown
  httpMethod?: unknown
  availability?: unknown
  description?: unknown
  argsSchema?: { fields?: unknown } | unknown
  argsTree?: unknown
}

function normalizeField(raw: unknown): GcOperationField | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as RawArgsField
  const name = typeof r.name === 'string' ? r.name : ''
  if (!name) return null
  const type =
    r.type === 'string' ||
    r.type === 'number' ||
    r.type === 'boolean' ||
    r.type === 'array' ||
    r.type === 'object'
      ? r.type
      : 'string'
  return {
    name,
    type,
    required: typeof r.required === 'boolean' ? r.required : false,
    description: typeof r.description === 'string' ? r.description : undefined
  }
}

function normalizeEntry(raw: unknown): GcOperationEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as RawOperationSummary
  if (r.availability !== 'enabled') return null
  const op = typeof r.op === 'string' ? r.op : ''
  if (!op) return null
  const httpMethod = r.httpMethod === 'GET' || r.httpMethod === 'POST' ? r.httpMethod : null
  if (!httpMethod) return null
  const argsSchema = r.argsSchema as { fields?: unknown } | null | undefined
  const rawFields = argsSchema && Array.isArray(argsSchema.fields) ? argsSchema.fields : []
  const fields: GcOperationField[] = []
  for (const f of rawFields) {
    const norm = normalizeField(f)
    if (norm) fields.push(norm)
  }
  const description = typeof r.description === 'string' ? r.description : undefined
  const argsTree =
    typeof r.argsTree === 'object' && r.argsTree !== null ? (r.argsTree as ArgsTreeNode) : undefined
  return { op, httpMethod, description, fields, argsTree }
}

/**
 * Загрузить каталог enabled-операций GC для рендера дропдауна на главной.
 * При любом сбое возвращает пустой массив и пишет в логи.
 */
export async function fetchGcOperations(ctx: app.Ctx): Promise<GcOperationEntry[]> {
  const start = Date.now()

  const enabled = await settingsLib.getGcEnabled(ctx)
  if (!enabled) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] disabled`,
      payload: { reason: 'gc_enabled=false' }
    })
    return []
  }

  const baseUrl = await settingsLib.getGcBaseUrl(ctx)
  if (!baseUrl) {
    await loggerLib.writeServerLog(ctx, {
      severity: 5,
      message: `[${LOG_MODULE}] base_url_missing`,
      payload: {}
    })
    return []
  }

  if (!settingsLib.isValidGatewayBaseUrl(baseUrl)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] base_url_invalid`,
      payload: { baseUrl }
    })
    return []
  }

  const noTrailing = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const url = `${noTrailing}${GATEWAY_API_PREFIX}/operations`

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] fetch_start`,
    payload: { url }
  })

  let response: { statusCode: number; body: unknown }
  try {
    response = await request({
      url,
      method: 'get',
      responseType: 'text',
      throwHttpErrors: false,
      timeout: INVOKE_TIMEOUT_MS
    })
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] network_error`,
      payload: { url, error: String(error), durationMs: Date.now() - start }
    })
    return []
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] non_2xx`,
      payload: {
        url,
        httpStatus: response.statusCode,
        durationMs: Date.now() - start
      }
    })
    return []
  }

  const rawText = typeof response.body === 'string' ? response.body : ''
  let parsed: unknown
  try {
    parsed = rawText.trim() ? JSON.parse(rawText) : null
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] parse_error`,
      payload: { url, error: String(error) }
    })
    return []
  }

  const data = (parsed as { ok?: unknown; data?: unknown })?.data
  const operationsRaw = (data as { operations?: unknown })?.operations
  if (!Array.isArray(operationsRaw)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] unexpected_shape`,
      payload: { url, hasData: !!data }
    })
    return []
  }

  const entries: GcOperationEntry[] = []
  for (const raw of operationsRaw) {
    const norm = normalizeEntry(raw)
    if (norm) entries.push(norm)
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] fetch_ok`,
    payload: {
      url,
      total: operationsRaw.length,
      enabled: entries.length,
      durationMs: Date.now() - start
    }
  })

  return entries
}
