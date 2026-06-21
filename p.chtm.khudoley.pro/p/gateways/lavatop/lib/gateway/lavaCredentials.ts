/**
 * Чтение и валидация заголовка `X-Lava-Apikey` (API-ключ магазина Lava.Top).
 * В отличие от LifePay, у Lava.Top нет логина — только один секрет, который gateway
 * проксирует в `X-Api-Key` к Lava.Top. Чтение из `req.headers` нечувствительно к регистру.
 */

import { X_LAVA_APIKEY } from '../../shared/gatewayHttpHeaders'
import { GatewayErrorCode } from './gatewayErrors'

export type LavaCredentials = { apikey: string }

export type LavaCredentialsResult =
  | { kind: 'ok'; credentials: LavaCredentials }
  | { kind: 'error'; code: GatewayErrorCode; details?: Record<string, unknown> }

function readHeader(headers: Record<string, unknown> | undefined, name: string): string | null {
  if (!headers) return null
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
 * Извлекает и валидирует `X-Lava-Apikey`. Отсутствие заголовка → `INVOKE_LAVA_APIKEY_MISSING`
 * (HTTP 401); пустое значение → `INVOKE_LAVA_APIKEY_INVALID` (400). Без обращения к Lava.Top.
 */
export function extractAndValidateLavaCredentials(
  headers: Record<string, unknown> | undefined
): LavaCredentialsResult {
  const apikeyRaw = readHeader(headers, X_LAVA_APIKEY)
  if (apikeyRaw === null) {
    return { kind: 'error', code: 'INVOKE_LAVA_APIKEY_MISSING' }
  }
  const apikey = apikeyRaw.trim()
  if (apikey === '') {
    return { kind: 'error', code: 'INVOKE_LAVA_APIKEY_INVALID' }
  }
  return { kind: 'ok', credentials: { apikey } }
}

/**
 * Безопасное представление API-ключа для логов и `error.details`: только длина, без значения.
 */
export function maskLavaApikey(apikey: string): string {
  return `key_len:${apikey.length}`
}
