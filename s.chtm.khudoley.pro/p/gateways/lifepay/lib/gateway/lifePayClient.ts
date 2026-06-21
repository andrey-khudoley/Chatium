/**
 * Хелпер исходящего вызова к LifePay поверх `@app/request` (operation-manual §4.5, §8.1).
 * Прямой `fetch` / `XHR` запрещён. Серверные ретраи запрещены: один входящий → один исходящий
 * (§8.6, §12.4). Таймаут — `GW_OUTBOUND_TIMEOUT_MS` (§8.1, §12.2).
 *
 * Возвращает дискриминированное объединение, классифицирующее ответ на транспортном уровне
 * (§2.8.1): успех 2xx с JSON, не-2xx, network-ошибка, таймаут, ошибка JSON-парсинга.
 */

import { request } from '@app/request'
import { GW_OUTBOUND_TIMEOUT_MS } from './constants'
import type { LpCredentials } from './lpCredentials'

export type LpClientResult =
  | { kind: 'json_ok'; lpStatus: number; lpJson: unknown; lpRawText: string }
  | { kind: 'upstream_status'; lpStatus: number; lpRawText: string }
  | { kind: 'upstream_parse_error'; lpStatus: number; lpRawText: string }
  | { kind: 'network_error' }
  | { kind: 'timeout' }

/** Размер обрезки сырого ответа LifePay в результате клиента (защита от мега-буферов). */
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

/**
 * Выполнить `POST <url>` с JSON-телом, разобрать ответ. Без серверных ретраев.
 */
export async function lifePayPostJson(
  url: string,
  body: Record<string, unknown>
): Promise<LpClientResult> {
  let response: { statusCode: number; body: unknown }
  try {
    response = await request({
      url,
      method: 'post',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      json: body,
      responseType: 'text',
      throwHttpErrors: false,
      timeout: GW_OUTBOUND_TIMEOUT_MS
    })
  } catch (error) {
    return isTimeoutError(error) ? { kind: 'timeout' } : { kind: 'network_error' }
  }

  const lpStatus = response.statusCode
  const rawTextFull = typeof response.body === 'string' ? response.body : ''
  const rawText = truncateRawText(rawTextFull)
  if (lpStatus < 200 || lpStatus > 299) {
    return { kind: 'upstream_status', lpStatus, lpRawText: rawText }
  }

  if (rawTextFull.trim() === '') {
    return { kind: 'upstream_parse_error', lpStatus, lpRawText: rawText }
  }
  try {
    const lpJson = JSON.parse(rawTextFull)
    return { kind: 'json_ok', lpStatus, lpJson, lpRawText: rawText }
  } catch {
    return { kind: 'upstream_parse_error', lpStatus, lpRawText: rawText }
  }
}

/**
 * Выполнить `GET <url>?apikey=...&login=...&...query` к LifePay. Без серверных ретраев.
 * Секреты передаются через параметр `credentials` отдельно от прикладных `query` — это позволяет
 * хелперу владеть единственным местом сборки query (operation-manual §4.5 для контура `bills_v1`).
 */
export async function lifePayGetJson(
  url: string,
  credentials: LpCredentials,
  query: Record<string, string>
): Promise<LpClientResult> {
  let response: { statusCode: number; body: unknown }
  try {
    response = await request({
      url,
      method: 'get',
      searchParams: {
        apikey: credentials.apikey,
        login: credentials.login,
        ...query
      },
      responseType: 'text',
      throwHttpErrors: false,
      timeout: GW_OUTBOUND_TIMEOUT_MS
    })
  } catch (error) {
    return isTimeoutError(error) ? { kind: 'timeout' } : { kind: 'network_error' }
  }

  const lpStatus = response.statusCode
  const rawTextFull = typeof response.body === 'string' ? response.body : ''
  const rawText = truncateRawText(rawTextFull)
  if (lpStatus < 200 || lpStatus > 299) {
    return { kind: 'upstream_status', lpStatus, lpRawText: rawText }
  }

  if (rawTextFull.trim() === '') {
    return { kind: 'upstream_parse_error', lpStatus, lpRawText: rawText }
  }
  try {
    const lpJson = JSON.parse(rawTextFull)
    return { kind: 'json_ok', lpStatus, lpJson, lpRawText: rawText }
  } catch {
    return { kind: 'upstream_parse_error', lpStatus, lpRawText: rawText }
  }
}
