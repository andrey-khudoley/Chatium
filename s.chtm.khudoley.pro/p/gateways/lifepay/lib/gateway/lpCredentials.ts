/**
 * Чтение и валидация заголовков `X-Lp-Apikey` / `X-Lp-Login` (operation-manual §2.2, §2.5, §5.3).
 * Извлечение значений из `req.headers` нечувствительно к регистру: HTTP-заголовки case-insensitive.
 */

import { isValidLpLogin } from '../../shared/gatewaySettingKeys'
import { X_LP_APIKEY, X_LP_LOGIN } from '../../shared/gatewayHttpHeaders'
import { GatewayErrorCode } from './gatewayErrors'

export type LpCredentials = { apikey: string; login: string }

export type LpCredentialsResult =
  | { kind: 'ok'; credentials: LpCredentials }
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
 * Извлекает обе пары секретов из заголовков и валидирует их в порядке: apikey → login (§2.5).
 * При нарушении возвращает первую обнаруженную ошибку §10 (без вызова LifePay, §5.3).
 */
export function extractAndValidateLpCredentials(
  headers: Record<string, unknown> | undefined
): LpCredentialsResult {
  const apikeyRaw = readHeader(headers, X_LP_APIKEY)
  if (apikeyRaw === null) {
    return { kind: 'error', code: 'INVOKE_LP_APIKEY_MISSING' }
  }
  const apikey = apikeyRaw.trim()
  if (apikey === '') {
    return { kind: 'error', code: 'INVOKE_LP_APIKEY_INVALID' }
  }

  const loginRaw = readHeader(headers, X_LP_LOGIN)
  if (loginRaw === null) {
    return { kind: 'error', code: 'INVOKE_LP_LOGIN_MISSING' }
  }
  const login = loginRaw.trim()
  if (login === '' || !isValidLpLogin(login)) {
    return { kind: 'error', code: 'INVOKE_LP_LOGIN_INVALID' }
  }

  return { kind: 'ok', credentials: { apikey, login } }
}

/**
 * Маска `login` для безопасного включения в `error.details` и логи (operation-manual §2.5, §5.7).
 * `79161234567` → `+7916***4567`.
 */
export function maskLpLogin(login: string): string {
  if (login.length !== 11) return '+7***'
  return `+${login.slice(0, 4)}***${login.slice(7)}`
}
