/**
 * Общий тип результата исходящего вызова к любому платёжному gateway.
 * Используется LifePay-клиентом, Lava.Top-клиентом и диспетчером.
 */

export type InvokeResult = {
  httpStatus: number
  ok: boolean
  requestId: string
  /** Тело ответа gateway (распарсенный JSON). */
  responseBody: Record<string, unknown> | null
  /** Сырой текст тела ответа (для проксирования клиенту без изменений). */
  rawResponseBody: string
  /** Заголовок Content-Type ответа gateway. */
  responseContentType: string
  /** Длительность исходящего вызова, мс. */
  durationMs: number
  /** Локальная ошибка прокладки (settings_missing, op_unknown, network_error...) — пустая, если запрос ушёл и ответ распарсен. */
  proxyError: string
}

/**
 * Локальный результат-ошибка прокладки до фактического сетевого запроса.
 * Используется LifePay- и Lava.Top-клиентами одинаково.
 */
export function buildProxyErrorResult(
  code: string,
  httpStatus: number,
  message: string,
  durationMs: number
): InvokeResult {
  const body = {
    ok: false,
    error: { code, message },
    requestId: null
  }
  const rawBody = JSON.stringify(body)
  return {
    httpStatus,
    ok: false,
    requestId: '',
    responseBody: body,
    rawResponseBody: rawBody,
    responseContentType: 'application/json',
    durationMs,
    proxyError: code
  }
}

export function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { name?: unknown; code?: unknown; message?: unknown }
  if (typeof e.name === 'string' && /timeout/i.test(e.name)) return true
  if (typeof e.code === 'string' && /timeout|ETIMEDOUT/i.test(e.code)) return true
  if (typeof e.message === 'string' && /timeout|timed out/i.test(e.message)) return true
  return false
}

import { X_GATEWAY_REQUEST_ID } from '../../shared/gatewayContract'

export function readResponseRequestId(
  headers: unknown,
  parsedBody: Record<string, unknown> | null
): string {
  if (headers && typeof headers === 'object') {
    const h = headers as Record<string, unknown>
    for (const key of Object.keys(h)) {
      if (key.toLowerCase() === X_GATEWAY_REQUEST_ID.toLowerCase()) {
        const v = h[key]
        if (typeof v === 'string' && v.trim() !== '') return v
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v[0]
      }
    }
  }
  if (parsedBody && typeof parsedBody === 'object') {
    const rid = (parsedBody as Record<string, unknown>).requestId
    if (typeof rid === 'string' && rid.trim() !== '') return rid
  }
  return ''
}

export function readContentType(headers: unknown): string {
  if (headers && typeof headers === 'object') {
    const h = headers as Record<string, unknown>
    for (const key of Object.keys(h)) {
      if (key.toLowerCase() === 'content-type') {
        const v = h[key]
        if (typeof v === 'string') return v
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v[0]
      }
    }
  }
  return 'application/json'
}
