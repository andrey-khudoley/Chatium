/**
 * Клиент исходящих вызовов к GC payments-gateway.
 *
 * Поведение:
 *  - база URL: `gc_base_url`.
 *  - заголовки школы: `X-Gc-School-Api-Key` (значение `gc_test_school_api_key`)
 *    и `X-Gc-School-Host` (значение `gc_test_school_host`).
 *  - HTTP-метод операции приходит как параметр (`httpMethod`), так как каталог
 *    GC динамический и не доступен в момент `api/gateways/invoke` без сетевого запроса.
 *  - валидация имени операции (`validateGcOpName`) выполняется выше — здесь
 *    значение `op` используется как сегмент URL.
 *
 * Один входящий `POST /api/gateways/invoke` с `gatewayId='gc'` → ровно один
 * исходящий вызов через `@app/request`. Серверные ретраи запрещены.
 * `requestId` берётся из ответа gateway (`X-Gateway-Request-Id`).
 */

import { request } from '@app/request'

import { INVOKE_TIMEOUT_MS } from './constants'
import { GATEWAY_API_PREFIX } from '../../config/gatewayUrls'
import * as settingsLib from '../settings.lib'
import * as loggerLib from '../logger.lib'
import { X_GC_SCHOOL_API_KEY, X_GC_SCHOOL_HOST } from '../../shared/gatewayContract'
import { INVOKE_PROXY_ERROR_CODES } from '../../shared/invokeApi'
import {
  buildProxyErrorResult,
  isTimeoutError,
  readContentType,
  readResponseRequestId,
  type InvokeResult
} from './invokeResult'

const LOG_MODULE = 'lib/gateway/gcClient'

/**
 * Выполнить вызов GC payments-gateway.
 * Заголовки школы подставляются из настроек клиента.
 */
export async function invokeGcGateway(
  ctx: app.Ctx,
  op: string,
  args: Record<string, unknown>,
  httpMethod: 'GET' | 'POST'
): Promise<InvokeResult> {
  const start = Date.now()

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] invokeGcGateway entry`,
    payload: { op, httpMethod, argsKeys: Object.keys(args) }
  })

  const [baseUrl, schoolApiKey, schoolHost] = await Promise.all([
    settingsLib.getGcBaseUrl(ctx),
    settingsLib.getGcTestSchoolApiKey(ctx),
    settingsLib.getGcTestSchoolHost(ctx)
  ])

  if (!schoolApiKey || !schoolHost) {
    const durationMs = Date.now() - start
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] settings_missing`,
      payload: {
        op,
        schoolApiKeyEmpty: !schoolApiKey,
        schoolHostEmpty: !schoolHost
      }
    })
    return buildProxyErrorResult(
      INVOKE_PROXY_ERROR_CODES.SETTINGS_MISSING,
      503,
      'Настройки GC не заполнены (gc_test_school_api_key / gc_test_school_host). Откройте админку проекта.',
      durationMs
    )
  }

  if (!settingsLib.isValidGatewayBaseUrl(baseUrl)) {
    const durationMs = Date.now() - start
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] base_url_invalid`,
      payload: { op }
    })
    return buildProxyErrorResult(
      INVOKE_PROXY_ERROR_CODES.SETTINGS_MISSING,
      503,
      'gc_base_url некорректен (ожидается http(s)://...).',
      durationMs
    )
  }

  if (!settingsLib.isValidGcSchoolHost(schoolHost)) {
    const durationMs = Date.now() - start
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] school_host_invalid`,
      payload: { op }
    })
    return buildProxyErrorResult(
      INVOKE_PROXY_ERROR_CODES.SETTINGS_MISSING,
      503,
      'gc_test_school_host некорректен (ожидается hostname без схемы).',
      durationMs
    )
  }

  const noTrailing = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const url = `${noTrailing}${GATEWAY_API_PREFIX}/${op}`

  const headers: Record<string, string> = {
    [X_GC_SCHOOL_API_KEY]: schoolApiKey,
    [X_GC_SCHOOL_HOST]: schoolHost
  }
  if (httpMethod === 'POST') {
    headers['Content-Type'] = 'application/json; charset=utf-8'
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] gateway_request_init`,
    payload: {
      op,
      method: httpMethod,
      url,
      schoolApiKeyLength: schoolApiKey.length
    }
  })

  let response: { statusCode: number; body: unknown; headers?: unknown }
  try {
    if (httpMethod === 'POST') {
      response = await request({
        url,
        method: 'post',
        headers,
        json: args,
        responseType: 'text',
        throwHttpErrors: false,
        timeout: INVOKE_TIMEOUT_MS
      })
    } else {
      const searchParams: Record<string, string> = {}
      for (const [k, v] of Object.entries(args)) {
        if (v === undefined || v === null) continue
        searchParams[k] =
          typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
            ? String(v)
            : JSON.stringify(v)
      }
      response = await request({
        url,
        method: 'get',
        headers,
        searchParams,
        responseType: 'text',
        throwHttpErrors: false,
        timeout: INVOKE_TIMEOUT_MS
      })
    }
  } catch (error) {
    const durationMs = Date.now() - start
    const timeout = isTimeoutError(error)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] gateway_${timeout ? 'timeout' : 'network_error'}`,
      payload: { op, durationMs, errorMessage: String(error) }
    })
    const code = timeout ? 'INVOKE_GC_TIMEOUT' : 'INVOKE_GC_NETWORK_ERROR'
    const message = timeout
      ? 'Превышено время ожидания ответа от GC gateway.'
      : 'Не удалось установить соединение с GC gateway.'
    return buildProxyErrorResult(code, timeout ? 504 : 502, message, durationMs)
  }

  const durationMs = Date.now() - start
  const rawText = typeof response.body === 'string' ? response.body : ''
  let parsedBody: Record<string, unknown> | null = null
  try {
    parsedBody = rawText.trim() ? (JSON.parse(rawText) as Record<string, unknown>) : null
  } catch {
    parsedBody = null
  }
  const requestId = readResponseRequestId(response.headers, parsedBody)
  const contentType = readContentType(response.headers)
  const ok = !!(parsedBody && parsedBody.ok === true)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] gateway_response`,
    payload: {
      op,
      httpStatus: response.statusCode,
      ok,
      requestId,
      durationMs,
      hasBody: !!parsedBody
    }
  })

  return {
    httpStatus: response.statusCode,
    ok,
    requestId,
    responseBody: parsedBody,
    rawResponseBody: rawText,
    responseContentType: contentType,
    durationMs,
    proxyError: ''
  }
}
