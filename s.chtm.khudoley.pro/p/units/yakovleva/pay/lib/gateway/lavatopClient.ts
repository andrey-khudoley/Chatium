/**
 * Клиент исходящих вызовов к Lava.Top payments-gateway.
 *
 * Аналог LifePay-клиента (`lib/gateway/invokeClient.ts`), но:
 *  - база URL: `lava_base_url` (empty/legacy values resolve through config/gatewayUrls).
 *  - заголовок авторизации: `X-Lava-Apikey` со значением `lava_test_apikey`.
 *  - каталог операций: `LAVATOP_OPERATIONS` (createInvoice / getInvoiceStatus /
 *    listProducts / updateOfferPrice).
 *
 * Один входящий `POST /api/gateways/invoke` с `gatewayId='lavatop'` → ровно один
 * исходящий вызов через `@app/request`. Серверные ретраи запрещены.
 * `requestId` берётся из ответа gateway (`X-Gateway-Request-Id`).
 */

import { request } from '@app/request'

import { INVOKE_TIMEOUT_MS } from './constants'
import { GATEWAY_API_PREFIX } from '../../config/gatewayUrls'
import * as settingsLib from '../settings.lib'
import * as loggerLib from '../logger.lib'
import { X_LAVA_APIKEY, findOperationInGateway } from '../../shared/gatewayContract'
import { INVOKE_PROXY_ERROR_CODES } from '../../shared/invokeApi'
import {
  buildProxyErrorResult,
  isTimeoutError,
  readContentType,
  readResponseRequestId,
  type InvokeResult
} from './invokeResult'

const LOG_MODULE = 'lib/gateway/lavatopClient'

/**
 * Выполнить вызов Lava.Top payments-gateway.
 * Секрет подставляется в заголовок X-Lava-Apikey.
 */
export async function invokeLavatopGateway(
  ctx: app.Ctx,
  op: string,
  args: Record<string, unknown>
): Promise<InvokeResult> {
  const start = Date.now()

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] invokeLavatopGateway entry`,
    payload: { op, argsKeys: Object.keys(args) }
  })

  const apikey = await settingsLib.getLavaTestApikey(ctx)
  const baseUrl = await settingsLib.getLavaBaseUrl(ctx)

  if (!apikey) {
    const durationMs = Date.now() - start
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] settings_missing`,
      payload: {
        op,
        apikeyEmpty: !apikey
      }
    })
    return buildProxyErrorResult(
      INVOKE_PROXY_ERROR_CODES.SETTINGS_MISSING,
      503,
      'Настройки Lava.Top не заполнены (lava_test_apikey). Откройте админку проекта.',
      durationMs
    )
  }

  const entry = findOperationInGateway('lavatop', op)
  if (!entry) {
    const durationMs = Date.now() - start
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] op_unknown`,
      payload: { op }
    })
    return buildProxyErrorResult(
      INVOKE_PROXY_ERROR_CODES.OP_UNKNOWN,
      400,
      'Операция не найдена в локальном каталоге клиентской прокладки (Lava.Top).',
      durationMs
    )
  }

  const trimmed = baseUrl.trim()
  if (!trimmed) {
    const durationMs = Date.now() - start
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] invokeLavatopGateway: base_url_invalid`,
      payload: { op }
    })
    return buildProxyErrorResult(
      INVOKE_PROXY_ERROR_CODES.SETTINGS_MISSING,
      503,
      'lava_base_url пуст или некорректен.',
      durationMs
    )
  }
  const noTrailing = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
  const url = `${noTrailing}${GATEWAY_API_PREFIX}/${op}`
  const method = entry.httpMethod

  const headers: Record<string, string> = {
    [X_LAVA_APIKEY]: apikey
  }
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json; charset=utf-8'
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] gateway_request_init`,
    payload: { op, method, url, apikeyLength: apikey.length }
  })

  let response: { statusCode: number; body: unknown; headers?: unknown }
  try {
    if (method === 'POST') {
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
    const code = timeout ? 'INVOKE_LAVA_TIMEOUT' : 'INVOKE_LAVA_NETWORK_ERROR'
    const message = timeout
      ? 'Превышено время ожидания ответа от Lava.Top gateway.'
      : 'Не удалось установить соединение с Lava.Top gateway.'
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
