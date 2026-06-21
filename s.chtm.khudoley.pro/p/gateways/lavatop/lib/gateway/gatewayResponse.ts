/**
 * Сборка HTTP-ответа публичных роутов `/v1/{op}`: объект `{ statusCode, rawHttpBody, headers }`
 * с заголовком `X-Gateway-Request-Id`, совпадающим с `requestId` в JSON-теле.
 * Контракт тела: `{ ok, data, error, requestId }`.
 */

import { getErrorMeta, GatewayErrorCode } from './gatewayErrors'
import { X_GATEWAY_REQUEST_ID } from '../../shared/gatewayHttpHeaders'

export type GatewayHttpResponse = {
  statusCode: number
  rawHttpBody: string
  headers: Record<string, string>
}

function baseHeaders(requestId: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    [X_GATEWAY_REQUEST_ID]: requestId
  }
}

export type GatewayWarning = { code: string; message: string }

/**
 * Успешный ответ `/v1/{op}`. При `availability = 'beta'` передаётся `warnings`
 * минимум с `GATEWAY_OP_BETA_UNSTABLE`.
 */
export function buildOkResponse(
  requestId: string,
  data: unknown,
  warnings?: GatewayWarning[]
): GatewayHttpResponse {
  const payload: { ok: true; data: unknown; requestId: string; warnings?: GatewayWarning[] } = {
    ok: true,
    data,
    requestId
  }
  if (warnings && warnings.length > 0) {
    payload.warnings = warnings
  }
  return {
    statusCode: 200,
    rawHttpBody: JSON.stringify(payload),
    headers: baseHeaders(requestId)
  }
}

/** Каноническое предупреждение beta-операции. */
export const GATEWAY_OP_BETA_UNSTABLE_WARNING: GatewayWarning = {
  code: 'GATEWAY_OP_BETA_UNSTABLE',
  message:
    'Этот метод gateway находится в режиме бета: поведение и ответы могут меняться. Используйте на свой риск и сверяйтесь с каталогом GET /v1/operations.'
}

/** Ответ-ошибка `/v1/{op}`. */
export function buildErrorResponse(
  requestId: string,
  code: GatewayErrorCode,
  details?: Record<string, unknown>
): GatewayHttpResponse {
  const meta = getErrorMeta(code)
  const errorObj: { code: string; message: string; details?: Record<string, unknown> } = {
    code,
    message: meta.message
  }
  if (details && Object.keys(details).length > 0) {
    errorObj.details = details
  }
  const payload = { ok: false, error: errorObj, requestId }
  return {
    statusCode: meta.statusCode,
    rawHttpBody: JSON.stringify(payload),
    headers: baseHeaders(requestId)
  }
}
