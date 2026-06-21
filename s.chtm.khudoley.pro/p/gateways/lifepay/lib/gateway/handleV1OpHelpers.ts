/**
 * Вспомогательные функции и типы для общей цепочки `/v1/{op}` (см. handleV1Op.ts).
 * Вынесены в отдельный модуль ради лимита на размер файла; поведение не меняется.
 */

import * as loggerLib from '../logger.lib'
import { validateCreateBillAmountPositive } from './operationsCatalog'
import type { GatewayHttpResponse } from './gatewayResponse'
import { redactRawDeep } from '../../shared/redactRaw'
import * as gatewayRequestLogRepo from '../../repos/gatewayRequestLog.repo'
import * as gatewayUpstreamLogRepo from '../../repos/gatewayUpstreamLog.repo'

export const LOG_PATH = 'lib/gateway/handleV1Op'

/** Аккумулятор данных для финальной записи в журналы gateway. */
export type GatewayLogCtx = {
  requestId: string
  op: string
  contour: string
  method: string
  requestStart: number
  rawArgs: unknown
  rawHeadersSafe: unknown
  upstream: null | {
    kind: string
    lpHttpStatus: number
    rawLpJson: unknown
    semanticRule: string
    sentAt: number
    durationMs: number
  }
}

/** Заголовки, которые ВСЕГДА исключаем из rawHeadersSafe до применения redactRawDeep. */
const HEADERS_SECRET_BLOCKLIST = new Set([
  'x-lp-apikey',
  'x-lp-login',
  'authorization',
  'cookie',
  'set-cookie'
])

export function stripSecretHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(headers)) {
    if (HEADERS_SECRET_BLOCKLIST.has(k.toLowerCase())) continue
    out[k] = v
  }
  return out
}

function extractErrorCodeFromResponse(resp: GatewayHttpResponse): string {
  let body: Record<string, unknown> | null = null
  try {
    const parsed = JSON.parse(resp.rawHttpBody)
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>
  } catch {
    return ''
  }
  if (!body || body.ok === true) return ''
  const error = body.error
  if (error && typeof error === 'object') {
    const code = (error as Record<string, unknown>).code
    if (typeof code === 'string') return code
  }
  return ''
}

export async function writeGatewayLogs(
  ctx: app.Ctx,
  gwLog: GatewayLogCtx,
  resp: GatewayHttpResponse | null
): Promise<void> {
  const clientHttpStatus = resp?.statusCode ?? 500
  const errorCode = resp ? extractErrorCodeFromResponse(resp) : 'INVOKE_INTERNAL_ERROR'
  const requestedAt = gwLog.requestStart
  const durationMs = Date.now() - requestedAt

  try {
    await gatewayRequestLogRepo.create(ctx, {
      requestId: gwLog.requestId,
      op: gwLog.op,
      contour: gwLog.contour,
      method: gwLog.method,
      rawArgs: gwLog.rawArgs,
      rawHeadersSafe: gwLog.rawHeadersSafe,
      clientHttpStatus,
      errorCode,
      durationMs,
      requestedAt
    })
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 7,
        message: 'writeGatewayLogs requestLog saved',
        payload: { requestId: gwLog.requestId, op: gwLog.op, durationMs }
      })
    } catch {
      // глотаем
    }
  } catch (e) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] gateway_request_log_write_failed`,
        payload: { requestId: gwLog.requestId, op: gwLog.op, error: String(e) }
      })
    } catch {
      // глотаем
    }
  }

  if (gwLog.upstream) {
    try {
      await gatewayUpstreamLogRepo.create(ctx, {
        requestId: gwLog.requestId,
        op: gwLog.op,
        upstreamKind: gwLog.upstream.kind,
        rawLpJson: gwLog.upstream.rawLpJson,
        lpHttpStatus: gwLog.upstream.lpHttpStatus,
        semanticRule: gwLog.upstream.semanticRule,
        durationMs: gwLog.upstream.durationMs,
        sentAt: gwLog.upstream.sentAt
      })
      try {
        await loggerLib.writeServerLog(ctx, {
          severity: 7,
          message: 'writeGatewayLogs upstreamLog saved',
          payload: { requestId: gwLog.requestId, op: gwLog.op }
        })
      } catch {
        // глотаем
      }
    } catch (e) {
      try {
        await loggerLib.writeServerLog(ctx, {
          severity: 3,
          message: `[${LOG_PATH}] gateway_upstream_log_write_failed`,
          payload: { requestId: gwLog.requestId, op: gwLog.op, error: String(e) }
        })
      } catch {
        // глотаем
      }
    }
  }
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function readQuery(req: app.Req): Record<string, unknown> {
  const q = (req as unknown as { query?: unknown }).query
  return isObject(q) ? q : {}
}

export function readBody(req: app.Req): unknown {
  return (req as unknown as { body?: unknown }).body
}

export function readHeaders(req: app.Req): Record<string, unknown> {
  const h = (req as unknown as { headers?: unknown }).headers
  return isObject(h) ? h : {}
}

export function readHeader(headers: Record<string, unknown>, name: string): string | null {
  const lower = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) {
      const v = headers[key]
      if (typeof v === 'string') return v
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v[0]
      return null
    }
  }
  return null
}

/**
 * `Content-Type` для POST с телом обязан быть `application/json` (operation-manual §2.2).
 * Допускается `charset=utf-8` и опциональные пробелы.
 */
export function isJsonContentType(headerValue: string | null): boolean {
  if (!headerValue) return false
  const lower = headerValue.toLowerCase().trim()
  if (lower === 'application/json') return true
  return lower.startsWith('application/json;')
}

/**
 * Грубая оценка размера тела для предотвращения превышения `GW_MAX_REQUEST_BODY_BYTES`
 * (manual §8.7, §12.3). Платформа Chatium разбирает JSON до handler-а, поэтому проверяем
 * длину сериализованного представления уже разобранного тела — это приближение, но
 * единственное доступное здесь. Точное значение `Content-Length` берётся из заголовка
 * при наличии.
 */
export function estimateBodySize(body: unknown, headers: Record<string, unknown>): number {
  const cl = readHeader(headers, 'Content-Length')
  if (cl !== null) {
    const n = Number(cl)
    if (Number.isFinite(n) && n >= 0) return n
  }
  try {
    return JSON.stringify(body).length
  } catch {
    return 0
  }
}

/**
 * Диагностический «отпечаток» тела ответа LifePay для логов `lp_semantic_error`. Содержит
 * структуру (ключи root и `data`) и значения признаковых полей (`status`, `code`, `error`),
 * по которым принимаются решения классификации. Значения других полей (телефон, email, ФИО,
 * сумма) не пишутся, чтобы не утечь персональные данные клиентов в админ-логи.
 */
export function extractLpJsonShape(lpJson: unknown): Record<string, unknown> | undefined {
  if (!isObject(lpJson)) {
    return { rootType: Array.isArray(lpJson) ? 'array' : typeof lpJson }
  }
  const shape: Record<string, unknown> = { rootKeys: Object.keys(lpJson) }
  const status = lpJson.status
  if (typeof status === 'string' || typeof status === 'number' || typeof status === 'boolean') {
    shape.rootStatus = status
  } else if (status !== undefined) {
    shape.rootStatusType = Array.isArray(status) ? 'array' : typeof status
  }
  if (typeof lpJson.code === 'number') shape.rootCode = lpJson.code
  if (typeof lpJson.message === 'string') shape.rootMessage = lpJson.message
  if (typeof lpJson.error === 'string') shape.rootError = lpJson.error
  if (typeof lpJson.number === 'string') shape.rootHasNumber = true
  const data = lpJson.data
  if (isObject(data)) {
    const dataKeys = Object.keys(data)
    shape.dataKeys = dataKeys
    const dStatus = data.status
    if (
      typeof dStatus === 'string' ||
      typeof dStatus === 'number' ||
      typeof dStatus === 'boolean'
    ) {
      shape.dataStatus = dStatus
    } else if (dStatus !== undefined) {
      shape.dataStatusType = Array.isArray(dStatus) ? 'array' : typeof dStatus
    }
    if (typeof data.code === 'number') shape.dataCode = data.code
    if (typeof data.error === 'string') shape.dataError = data.error
    if (typeof data.number === 'string') shape.dataHasNumber = true

    // Если data — словарь { [billNumber]: object } (как у LifePay bill/status), показать
    // структуру первой записи: ключи + только признаковые скаляры. Персональные значения
    // (телефон, email, ФИО, суммы клиента) не пишутся.
    const firstKey = dataKeys[0]
    if (firstKey !== undefined) {
      const firstEntry = (data as Record<string, unknown>)[firstKey]
      if (isObject(firstEntry)) {
        const entryShape: Record<string, unknown> = { keys: Object.keys(firstEntry) }
        for (const probe of [
          'status',
          'state',
          'code',
          'message',
          'paid',
          'cancelled',
          'created',
          'success'
        ]) {
          const v = firstEntry[probe]
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            entryShape[probe] = v
          } else if (v !== undefined) {
            entryShape[`${probe}Type`] = Array.isArray(v) ? 'array' : typeof v
          }
        }
        shape.dataFirstEntry = entryShape
      } else if (firstEntry !== undefined) {
        shape.dataFirstEntryType = Array.isArray(firstEntry) ? 'array' : typeof firstEntry
      }
    }
  } else if (data !== undefined) {
    shape.dataType = Array.isArray(data) ? 'array' : typeof data
  }
  return shape
}

/**
 * Дополнительная проверка `amount > 0` для `createBill` (схема `s.number()` положительность не
 * выражает). Применяется после успешной `safeParse`.
 */
export function applyPostValidatorChecks(
  op: string,
  args: Record<string, unknown>
): { kind: 'ok' } | { kind: 'error'; errors: Array<{ path: string; message: string }> } {
  if (op === 'createBill') {
    if (!validateCreateBillAmountPositive(args as { amount: number })) {
      return { kind: 'error', errors: [{ path: 'amount', message: 'должно быть больше нуля' }] }
    }
  }
  return { kind: 'ok' }
}
