/**
 * Клиент исходящих вызовов к payments-gateway LifePay (implementation-plan §1.8.2).
 *
 * Один входящий `POST /api/gateways/invoke` с `gatewayId='lifepay'` → ровно один
 * исходящий вызов через `@app/request`. Серверные ретраи запрещены (зеркало
 * §8.6, §12.4 gateway-manual). Секреты (`apikey`, `login`) подставляются в
 * заголовки `X-Lp-Apikey`, `X-Lp-Login`. `requestId` берётся из ответа
 * gateway (`X-Gateway-Request-Id`), не генерируется заново.
 *
 * Lava.Top-клиент — `lib/gateway/lavatopClient.ts`. Диспатчер по `gatewayId`
 * — `lib/gateway/invokeDispatcher.ts`.
 */

import { request } from '@app/request'

import { INVOKE_TIMEOUT_MS } from './constants'
import { buildInvokeUrl } from './buildInvokeUrl'
import * as settingsLib from '../settings.lib'
import * as loggerLib from '../logger.lib'
import { X_LP_APIKEY, X_LP_LOGIN } from '../../shared/gatewayContract'
import { INVOKE_PROXY_ERROR_CODES } from '../../shared/invokeApi'
import {
  buildProxyErrorResult,
  isTimeoutError,
  readContentType,
  readResponseRequestId,
  type InvokeResult
} from './invokeResult'

export type { InvokeResult } from './invokeResult'

const LOG_MODULE = 'lib/gateway/invokeClient'

/**
 * Выполнить вызов LifePay payments-gateway.
 * Секреты подставляются в заголовки X-Lp-Apikey / X-Lp-Login.
 */
export async function invokeGateway(
  ctx: app.Ctx,
  op: string,
  args: Record<string, unknown>
): Promise<InvokeResult> {
  const start = Date.now()

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] invokeGateway entry`,
    payload: { op, argsKeys: Object.keys(args) }
  })

  const apikey = await settingsLib.getLpApikey(ctx)
  const login = await settingsLib.getLpLogin(ctx)
  const baseUrl = await settingsLib.getGatewayBaseUrl(ctx)

  if (!apikey || !login) {
    const durationMs = Date.now() - start
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] settings_missing`,
      payload: {
        op,
        apikeyEmpty: !apikey,
        loginEmpty: !login
      }
    })
    return buildProxyErrorResult(
      INVOKE_PROXY_ERROR_CODES.SETTINGS_MISSING,
      503,
      'Настройки LifePay не заполнены (lp_apikey / lp_login). Откройте админку проекта.',
      durationMs
    )
  }

  const urlBuild = buildInvokeUrl(baseUrl, op)
  if (urlBuild.kind === 'op_unknown') {
    const durationMs = Date.now() - start
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] op_unknown`,
      payload: { op }
    })
    return buildProxyErrorResult(
      INVOKE_PROXY_ERROR_CODES.OP_UNKNOWN,
      400,
      'Операция не найдена в локальном каталоге клиентской прокладки (LifePay).',
      durationMs
    )
  }
  if (urlBuild.kind === 'base_url_invalid') {
    const durationMs = Date.now() - start
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] invokeLifepayGateway: base_url_invalid`,
      payload: { op }
    })
    return buildProxyErrorResult(
      INVOKE_PROXY_ERROR_CODES.SETTINGS_MISSING,
      503,
      'gateway_base_url пуст или некорректен.',
      durationMs
    )
  }

  const { url, method } = urlBuild

  // Заголовки общие для GET/POST. Content-Type только для POST.
  const headers: Record<string, string> = {
    [X_LP_APIKEY]: apikey,
    [X_LP_LOGIN]: login
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
      // GET: args идёт в query.
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
    const code = timeout ? 'INVOKE_LP_TIMEOUT' : 'INVOKE_LP_NETWORK_ERROR'
    const message = timeout
      ? 'Превышено время ожидания ответа от payments-gateway.'
      : 'Не удалось установить соединение с payments-gateway.'
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

/** Семантический синоним под расширенную многогейтвейную архитектуру. */
export const invokeLifepayGateway = invokeGateway
