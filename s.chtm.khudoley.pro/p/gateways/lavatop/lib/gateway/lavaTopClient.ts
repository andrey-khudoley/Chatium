/**
 * Хелпер исходящих вызовов к Lava.Top поверх `@app/request` (inner/docs/004-request.md).
 * Прямой `fetch` запрещён. Серверные ретраи запрещены: один входящий → один исходящий.
 * Авторизация — заголовок `X-Api-Key`. Таймаут — `GW_OUTBOUND_TIMEOUT_MS`.
 *
 * Возвращает дискриминированное объединение, классифицирующее ответ на транспортном уровне.
 * HTTP 429 (rate limit Lava.Top, 50 req/s) выделен в отдельный `kind: 'rate_limited'`.
 *
 * Outward-вызов: `request({ url, … })` без первого аргумента `ctx` — иначе в outward-контексте
 * возможна ошибка про `ctx.app`/proxy (см. lava_gc_integration/lib/lava-api.client.ts).
 */

import { request } from '@app/request'
import { GW_OUTBOUND_TIMEOUT_MS } from './constants'
import { X_API_KEY } from '../../shared/gatewayHttpHeaders'

export type LavaClientResult =
  | { kind: 'json_ok'; lpStatus: number; lpJson: unknown; lpRawText: string }
  | { kind: 'rate_limited'; lpStatus: number; lpRawText: string }
  | { kind: 'upstream_status'; lpStatus: number; lpRawText: string }
  | { kind: 'upstream_parse_error'; lpStatus: number; lpRawText: string }
  | { kind: 'network_error' }
  | { kind: 'timeout' }

/** Размер обрезки сырого ответа Lava.Top (защита от мега-буферов). */
const LP_RAW_TEXT_LIMIT = 64 * 1024

function truncateRawText(rawText: string): string {
  return rawText.length > LP_RAW_TEXT_LIMIT ? rawText.slice(0, LP_RAW_TEXT_LIMIT) : rawText
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { name?: unknown; code?: unknown; message?: unknown }
  if (typeof e.name === 'string' && /timeout/i.test(e.name)) return true
  if (typeof e.code === 'string' && /timeout|ETIMEDOUT/i.test(e.code)) return true
  if (typeof e.message === 'string' && /timeout|timed out/i.test(e.message)) return true
  return false
}

/** Разбор HTTP-ответа Lava.Top в `LavaClientResult` (общая ветка для POST/GET/PATCH). */
function classifyResponse(response: { statusCode: number; body: unknown }): LavaClientResult {
  const lpStatus = response.statusCode
  const rawTextFull = typeof response.body === 'string' ? response.body : ''
  const rawText = truncateRawText(rawTextFull)

  if (lpStatus === 429) {
    return { kind: 'rate_limited', lpStatus, lpRawText: rawText }
  }
  if (lpStatus < 200 || lpStatus > 299) {
    return { kind: 'upstream_status', lpStatus, lpRawText: rawText }
  }
  // 2xx без тела (например 204) — для проксирования считаем ok с пустым JSON.
  if (rawTextFull.trim() === '') {
    return { kind: 'json_ok', lpStatus, lpJson: {}, lpRawText: rawText }
  }
  try {
    const lpJson = JSON.parse(rawTextFull)
    return { kind: 'json_ok', lpStatus, lpJson, lpRawText: rawText }
  } catch {
    return { kind: 'upstream_parse_error', lpStatus, lpRawText: rawText }
  }
}

/** `POST <url>` с JSON-телом и заголовком `X-Api-Key`. Без серверных ретраев. */
export async function lavaTopPostJson(
  url: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<LavaClientResult> {
  try {
    const response = await request({
      url,
      method: 'post',
      headers: { [X_API_KEY]: apiKey, 'Content-Type': 'application/json' },
      json: body,
      responseType: 'text',
      throwHttpErrors: false,
      timeout: GW_OUTBOUND_TIMEOUT_MS
    })
    return classifyResponse(response)
  } catch (error) {
    return isTimeoutError(error) ? { kind: 'timeout' } : { kind: 'network_error' }
  }
}

/** `GET <url>` с заголовком `X-Api-Key`. URL передаётся целиком (включая query, напр. nextPage). */
export async function lavaTopGetJson(url: string, apiKey: string): Promise<LavaClientResult> {
  try {
    const response = await request({
      url,
      method: 'get',
      headers: { [X_API_KEY]: apiKey, Accept: 'application/json' },
      responseType: 'text',
      throwHttpErrors: false,
      timeout: GW_OUTBOUND_TIMEOUT_MS
    })
    return classifyResponse(response)
  } catch (error) {
    return isTimeoutError(error) ? { kind: 'timeout' } : { kind: 'network_error' }
  }
}

/** `PATCH <url>` с JSON-телом и заголовком `X-Api-Key`. Без серверных ретраев. */
export async function lavaTopPatchJson(
  url: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<LavaClientResult> {
  try {
    const response = await request({
      url,
      method: 'patch',
      headers: { [X_API_KEY]: apiKey, 'Content-Type': 'application/json' },
      json: body,
      responseType: 'text',
      throwHttpErrors: false,
      timeout: GW_OUTBOUND_TIMEOUT_MS
    })
    return classifyResponse(response)
  } catch (error) {
    return isTimeoutError(error) ? { kind: 'timeout' } : { kind: 'network_error' }
  }
}
