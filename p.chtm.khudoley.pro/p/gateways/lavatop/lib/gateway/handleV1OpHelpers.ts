/**
 * Помощники цепочки `/v1/{op}` (вынесены из handleV1Op ради лимита размера
 * файла): типы handler-результата, аккумулятор журналов, чтение req/headers,
 * запись в журналы gateway.
 */

import * as loggerLib from '../logger.lib'
import type { GatewayHttpResponse } from './gatewayResponse'
import type { LavaCredentials } from './lavaCredentials'
import type { LavaClientResult } from './lavaTopClient'
import type { InvoicesV1SemanticResult } from './invoicesV1Semantic'
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
  'x-lava-apikey',
  'x-api-key',
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

export type HandlerArgs<A> = {
  requestId: string
  credentials: LavaCredentials
  args: A
}

/**
 * Результат прикладного handler:
 *   - `kind: 'lp_result'` — транспортная реакция Lava.Top + (при json_ok) семантика и payload успеха.
 *   - `kind: 'gateway_error'` — локальная ошибка gateway без обращения к Lava.Top.
 */
export type HandlerResult =
  | {
      kind: 'lp_result'
      lp: LavaClientResult
      semantic?: InvoicesV1SemanticResult | null
      successData?: unknown
    }
  | {
      kind: 'gateway_error'
      code: import('./gatewayErrors').GatewayErrorCode
      details?: Record<string, unknown>
    }

export type V1OpHandler<A> = (ctx: app.Ctx, args: HandlerArgs<A>) => Promise<HandlerResult>

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

export function isJsonContentType(headerValue: string | null): boolean {
  if (!headerValue) return false
  const lower = headerValue.toLowerCase().trim()
  if (lower === 'application/json') return true
  return lower.startsWith('application/json;')
}

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

/** Диагностический «отпечаток» тела ответа Lava.Top для логов `lp_semantic_error` (без PII). */
export function extractLpJsonShape(lpJson: unknown): Record<string, unknown> | undefined {
  if (!isObject(lpJson)) {
    return { rootType: Array.isArray(lpJson) ? 'array' : typeof lpJson }
  }
  const shape: Record<string, unknown> = { rootKeys: Object.keys(lpJson) }
  shape.hasId = typeof lpJson.id === 'string' || typeof lpJson.contractId === 'string'
  shape.hasPaymentUrl =
    typeof lpJson.paymentUrl === 'string' || typeof lpJson.payment_url === 'string'
  if (typeof lpJson.status === 'string') shape.rootStatus = lpJson.status
  if (Array.isArray(lpJson.items)) shape.itemsCount = lpJson.items.length
  return shape
}
