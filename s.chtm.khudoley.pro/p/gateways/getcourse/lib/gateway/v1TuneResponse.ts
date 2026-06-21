import { GW_HEADER_GATEWAY_REQUEST_ID } from '../../shared/gatewayHttpHeaders'
import { V1_ERROR_HTTP_STATUS, V1_ERROR_MESSAGES } from './v1ErrorCatalog'

export type V1TuneResponse = {
  statusCode: number
  rawHttpBody: string
  headers: Record<string, string>
}

/** Ручная политика CORS для браузерных клиентов /v1/* (manual §7.7, §8.7). */
const V1_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': [
    'Content-Type',
    'Accept',
    GW_HEADER_GATEWAY_REQUEST_ID,
    'X-Gc-School-Host',
    'X-Gc-School-Api-Key'
  ].join(', '),
  'Access-Control-Expose-Headers': [GW_HEADER_GATEWAY_REQUEST_ID].join(', ')
}

export function v1JsonResponse(
  statusCode: number,
  payload: Record<string, unknown>,
  requestId: string
): V1TuneResponse {
  const body = { ...payload, requestId }
  return {
    statusCode,
    rawHttpBody: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      [GW_HEADER_GATEWAY_REQUEST_ID]: requestId,
      ...V1_CORS_HEADERS
    }
  }
}

export function v1SuccessResponse(
  data: unknown,
  requestId: string,
  warnings?: ReadonlyArray<{ code: string; message: string }>
): V1TuneResponse {
  const payload: Record<string, unknown> = { ok: true, data }
  if (warnings && warnings.length > 0) {
    payload.warnings = [...warnings]
  }
  return v1JsonResponse(200, payload, requestId)
}

export function v1ErrorResponse(
  code: keyof typeof V1_ERROR_MESSAGES | string,
  requestId: string,
  details?: Record<string, unknown>
): V1TuneResponse {
  const c = code as string
  const message = V1_ERROR_MESSAGES[c] ?? V1_ERROR_MESSAGES.INVOKE_INTERNAL_ERROR
  const status = V1_ERROR_HTTP_STATUS[c] ?? 500
  const error: Record<string, unknown> = { code: c, message }
  if (details && Object.keys(details).length > 0) {
    error.details = details
  }
  return v1JsonResponse(status, { ok: false, error }, requestId)
}
