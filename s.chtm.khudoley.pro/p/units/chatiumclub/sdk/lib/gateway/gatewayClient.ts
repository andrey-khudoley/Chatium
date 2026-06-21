import { request } from '@app/request'
import * as loggerLib from '../logger.lib'
import * as settingsLib from '../settings.lib'
import {
  GW_HEADER_GATEWAY_REQUEST_ID,
  GW_HEADER_SCHOOL_API_KEY,
  GW_HEADER_SCHOOL_HOST
} from '../../shared/gatewayHttpHeaders'
import { findV1OpsListEntry } from '../../shared/v1OpsList.generated'
import {
  SDK_GATEWAY_API_V1_PREFIX,
  SDK_GATEWAY_OPERATIONS_PATH,
  SDK_GATEWAY_REQUEST_TIMEOUT_MS
} from './constants'

const LOG_MODULE = 'lib/gateway/gatewayClient'

/** Поддерживаемые методы публичных эндпоинтов gateway (manual §2.1). */
export type GatewayHttpMethod = 'GET' | 'POST'

/** Аргументы вызова `invoke()` тонкого клиента. */
export type GatewayInvokeInput = {
  op: string
  args?: Record<string, unknown>
  /**
   * Явное переопределение HTTP-метода. Если не задано — берётся из локального
   * снимка `V1_OPS_LIST` (`shared/v1OpsList.generated.ts`); при отсутствии записи
   * возвращается ошибка `SDK_OP_HTTP_METHOD_UNKNOWN`, чтобы клиент не отправил
   * заведомо некорректный запрос (manual §10, `INVOKE_HTTP_METHOD_NOT_ALLOWED`).
   */
  httpMethod?: GatewayHttpMethod
}

/** Структурированная ошибка тонкого клиента. */
export type GatewayInvokeError = {
  /**
   * Машинный код ошибки. Может быть как кодом gateway (`INVOKE_*`,
   * `GATEWAY_*`, manual §10), так и SDK-кодом, если до gateway не дошли:
   * - `SDK_NOT_CONFIGURED` — не заданы `gateway_url` / `gc_school_host` /
   *   `gc_school_api_key` в Heap.
   * - `SDK_OP_HTTP_METHOD_UNKNOWN` — клиент не знает метод `op`.
   * - `SDK_GATEWAY_NETWORK_ERROR` — `@app/request` бросил исключение.
   * - `SDK_GATEWAY_INVALID_RESPONSE` — gateway вернул не JSON или JSON без
   *   `ok`/`error.code`.
   */
  code: string
  /** Человекочитаемый текст из ответа gateway либо локальный текст SDK. */
  message: string
  /** Опциональные подробности (`error.details` от gateway или SDK-контекст). */
  details?: Record<string, unknown>
}

/** Опциональные предупреждения gateway при `availability=beta` (manual §9.1, §10.1). */
export type GatewayInvokeWarning = {
  code: string
  message: string
}

/** Результат `invoke()`: успех `ok=true` с `data` либо `ok=false` с `error`. */
export type GatewayInvokeResult =
  | {
      ok: true
      data: unknown
      requestId: string | null
      warnings: GatewayInvokeWarning[]
      gatewayHttpStatus: number
    }
  | {
      ok: false
      error: GatewayInvokeError
      requestId: string | null
      warnings: GatewayInvokeWarning[]
      gatewayHttpStatus: number
    }

/**
 * Структура успешного каталога `GET /v1/operations` со стороны клиента.
 * `argsSchema` оставлен как `unknown` — формат сериализации схемы фиксируется
 * в репозитории gateway (manual §3.4) и не должен ограничивать SDK на уровне типов.
 */
export type GatewayOperationsCatalogEntry = {
  op: string
  httpMethod: GatewayHttpMethod
  contour: 'new' | 'legacy'
  availability: 'enabled' | 'beta' | 'disabled' | 'unsupported'
  argsSchema: unknown
}

export type GatewayOperationsCatalog = {
  catalogSchemaVersion: number
  operations: GatewayOperationsCatalogEntry[]
}

export type GatewayOperationsResult =
  | {
      ok: true
      catalog: GatewayOperationsCatalog
      requestId: string | null
      gatewayHttpStatus: number
    }
  | {
      ok: false
      error: GatewayInvokeError
      requestId: string | null
      gatewayHttpStatus: number
    }

/** Канонические тексты SDK-ошибок (gateway-коды текст приходит из ответа gateway). */
const SDK_ERROR_MESSAGES: Record<string, string> = {
  SDK_NOT_CONFIGURED:
    'SDK не настроен: задайте gateway_url, gc_school_host и gc_school_api_key в админке.',
  SDK_OP_HTTP_METHOD_UNKNOWN:
    'Не удалось определить HTTP-метод операции: записи нет в локальном каталоге, и метод не передан явно.',
  SDK_GATEWAY_NETWORK_ERROR:
    'Не удалось достучаться до gateway по HTTP. Проверьте gateway_url и доступность приложения gateway.',
  SDK_GATEWAY_INVALID_RESPONSE:
    'Gateway вернул ответ, который не является корректным JSON по контракту /v1/* (manual §9.1).'
}

function sdkErrorMessage(code: string): string {
  return SDK_ERROR_MESSAGES[code] ?? 'SDK: неизвестная ошибка тонкого клиента.'
}

function buildGatewayInvokeUrl(gatewayUrl: string, op: string): string {
  const base = gatewayUrl.replace(/\/+$/, '')
  return `${base}${SDK_GATEWAY_API_V1_PREFIX}/${op}`
}

function buildGatewayOperationsUrl(gatewayUrl: string): string {
  return `${gatewayUrl.replace(/\/+$/, '')}${SDK_GATEWAY_OPERATIONS_PATH}`
}

/** Преобразование `args` для query-строки GET-запроса к gateway. Объекты/массивы — `JSON.stringify`. */
function argsToSearchParams(args: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(args)) {
    if (v === undefined || v === null) continue
    if (typeof v === 'object') {
      out[k] = JSON.stringify(v)
    } else if (typeof v === 'boolean' || typeof v === 'number') {
      out[k] = String(v)
    } else {
      out[k] = String(v)
    }
  }
  return out
}

/** Извлечь `requestId` из тела ответа gateway или из заголовка `X-Gateway-Request-Id`. */
function extractRequestId(
  body: unknown,
  headers: Record<string, string | string[] | undefined>
): string | null {
  if (body && typeof body === 'object') {
    const rid = (body as Record<string, unknown>).requestId
    if (typeof rid === 'string' && rid.length > 0) return rid
  }
  const hv =
    headers[GW_HEADER_GATEWAY_REQUEST_ID] ?? headers[GW_HEADER_GATEWAY_REQUEST_ID.toLowerCase()]
  if (typeof hv === 'string' && hv.length > 0) return hv
  if (Array.isArray(hv) && hv.length > 0 && typeof hv[0] === 'string') return hv[0]
  return null
}

/** Достать массив warnings из тела ответа gateway, если он там есть (manual §9.1 для `beta`). */
function extractWarnings(body: unknown): GatewayInvokeWarning[] {
  if (!body || typeof body !== 'object') return []
  const w = (body as Record<string, unknown>).warnings
  if (!Array.isArray(w)) return []
  const out: GatewayInvokeWarning[] = []
  for (const it of w) {
    if (it && typeof it === 'object') {
      const code = (it as Record<string, unknown>).code
      const message = (it as Record<string, unknown>).message
      if (typeof code === 'string' && typeof message === 'string') {
        out.push({ code, message })
      }
    }
  }
  return out
}

/** Распарсить тело ошибки gateway в `GatewayInvokeError` (manual §9.1). */
function parseGatewayErrorBody(body: unknown): GatewayInvokeError | null {
  if (!body || typeof body !== 'object') return null
  const errObj = (body as Record<string, unknown>).error
  if (!errObj || typeof errObj !== 'object') return null
  const e = errObj as Record<string, unknown>
  const code = typeof e.code === 'string' ? e.code : ''
  if (!code) return null
  const message = typeof e.message === 'string' ? e.message : ''
  const details =
    e.details && typeof e.details === 'object' && !Array.isArray(e.details)
      ? (e.details as Record<string, unknown>)
      : undefined
  return { code, message, ...(details ? { details } : {}) }
}

/**
 * Тонкая прокладка к gateway: один HTTP-запрос на один вызов `invoke()`.
 * Контракт gateway — manual §2 (request lifecycle) и §9 (response contract).
 *
 * - Не выполняет ретраи (manual §8.6) и не реализует идемпотентность.
 * - Передаёт `X-Gc-School-Host` и `X-Gc-School-Api-Key` из настроек тонкого клиента.
 * - HTTP-метод выбирается из локального снимка `V1_OPS_LIST` или из аргумента `httpMethod`.
 * - В лог не попадают сами значения школьного ключа и тела ответа GC (manual §5.7).
 */
export async function invoke(
  ctx: app.Ctx,
  input: GatewayInvokeInput
): Promise<GatewayInvokeResult> {
  const op = String(input?.op ?? '').trim()
  const args: Record<string, unknown> = input?.args ?? {}

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] invoke entry`,
    payload: {
      logStage: 'sdk_invoke_entry',
      op,
      argsKeys: Object.keys(args),
      httpMethodOverride: input?.httpMethod ?? null
    }
  })

  if (!op) {
    return sdkFail(ctx, 'SDK_OP_HTTP_METHOD_UNKNOWN', { op })
  }

  const settings = await settingsLib.getGatewayClientSettings(ctx)
  if (!settings.gatewayUrl || !settings.gcSchoolHost || !settings.gcSchoolApiKey) {
    return sdkFail(ctx, 'SDK_NOT_CONFIGURED', {
      gatewayUrlPresent: !!settings.gatewayUrl,
      gcSchoolHostPresent: !!settings.gcSchoolHost,
      gcSchoolApiKeyPresent: !!settings.gcSchoolApiKey
    })
  }

  const localEntry = findV1OpsListEntry(op)
  const httpMethod: GatewayHttpMethod | null = input?.httpMethod ?? localEntry?.httpMethod ?? null
  if (httpMethod !== 'GET' && httpMethod !== 'POST') {
    return sdkFail(ctx, 'SDK_OP_HTTP_METHOD_UNKNOWN', { op })
  }

  const url = buildGatewayInvokeUrl(settings.gatewayUrl, op)
  const headers: Record<string, string> = {
    [GW_HEADER_SCHOOL_HOST]: settings.gcSchoolHost,
    [GW_HEADER_SCHOOL_API_KEY]: settings.gcSchoolApiKey,
    Accept: 'application/json'
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] invoke prepare`,
    payload: {
      logStage: 'sdk_invoke_prepare',
      op,
      httpMethod,
      url,
      schoolHost: settings.gcSchoolHost,
      schoolApiKeyLength: settings.gcSchoolApiKey.length
    }
  })

  let response: {
    statusCode: number
    body: unknown
    headers: Record<string, string | string[] | undefined>
  }
  try {
    if (httpMethod === 'GET') {
      const sp = argsToSearchParams(args)
      response = (await request({
        url,
        method: 'get',
        headers,
        ...(Object.keys(sp).length > 0 ? { searchParams: sp } : {}),
        responseType: 'json',
        throwHttpErrors: false,
        timeout: SDK_GATEWAY_REQUEST_TIMEOUT_MS
      })) as typeof response
    } else {
      response = (await request({
        url,
        method: 'post',
        headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
        json: args,
        responseType: 'json',
        throwHttpErrors: false,
        timeout: SDK_GATEWAY_REQUEST_TIMEOUT_MS
      })) as typeof response
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] invoke network error`,
      payload: { logStage: 'sdk_invoke_network_error', op, httpMethod, error: msg }
    })
    return {
      ok: false,
      error: {
        code: 'SDK_GATEWAY_NETWORK_ERROR',
        message: sdkErrorMessage('SDK_GATEWAY_NETWORK_ERROR'),
        details: { error: msg }
      },
      requestId: null,
      warnings: [],
      gatewayHttpStatus: 0
    }
  }

  const respHeaders = response.headers ?? {}
  const requestId = extractRequestId(response.body, respHeaders)
  const warnings = extractWarnings(response.body)
  const gatewayHttpStatus = typeof response.statusCode === 'number' ? response.statusCode : 0

  if (!response.body || typeof response.body !== 'object') {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] invoke invalid response`,
      payload: {
        logStage: 'sdk_invoke_invalid_response',
        op,
        httpMethod,
        gatewayHttpStatus,
        bodyType: typeof response.body
      }
    })
    return {
      ok: false,
      error: {
        code: 'SDK_GATEWAY_INVALID_RESPONSE',
        message: sdkErrorMessage('SDK_GATEWAY_INVALID_RESPONSE')
      },
      requestId,
      warnings,
      gatewayHttpStatus
    }
  }

  const okFlag = (response.body as Record<string, unknown>).ok === true
  if (okFlag) {
    const data = (response.body as Record<string, unknown>).data
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] invoke ok`,
      payload: {
        logStage: 'sdk_invoke_ok',
        op,
        httpMethod,
        gatewayHttpStatus,
        requestId,
        warningsCount: warnings.length,
        hasData: data !== undefined
      }
    })
    return { ok: true, data, requestId, warnings, gatewayHttpStatus }
  }

  const parsedError = parseGatewayErrorBody(response.body)
  if (!parsedError) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] invoke ok=false but error body invalid`,
      payload: {
        logStage: 'sdk_invoke_invalid_error_body',
        op,
        httpMethod,
        gatewayHttpStatus
      }
    })
    return {
      ok: false,
      error: {
        code: 'SDK_GATEWAY_INVALID_RESPONSE',
        message: sdkErrorMessage('SDK_GATEWAY_INVALID_RESPONSE')
      },
      requestId,
      warnings,
      gatewayHttpStatus
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] invoke gateway error`,
    payload: {
      logStage: 'sdk_invoke_gateway_error',
      op,
      httpMethod,
      gatewayHttpStatus,
      requestId,
      errorCode: parsedError.code
    }
  })
  return { ok: false, error: parsedError, requestId, warnings, gatewayHttpStatus }
}

/**
 * Прочитать каталог операций с gateway (`GET /v1/operations`, manual §3.3).
 * Заголовки школы здесь не передаются (manual §3.3).
 */
export async function getOperationsCatalog(ctx: app.Ctx): Promise<GatewayOperationsResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getOperationsCatalog entry`,
    payload: { logStage: 'sdk_operations_entry' }
  })
  const settings = await settingsLib.getGatewayClientSettings(ctx)
  if (!settings.gatewayUrl) {
    return {
      ok: false,
      error: { code: 'SDK_NOT_CONFIGURED', message: sdkErrorMessage('SDK_NOT_CONFIGURED') },
      requestId: null,
      gatewayHttpStatus: 0
    }
  }

  const url = buildGatewayOperationsUrl(settings.gatewayUrl)
  let response: {
    statusCode: number
    body: unknown
    headers: Record<string, string | string[] | undefined>
  }
  try {
    response = (await request({
      url,
      method: 'get',
      headers: { Accept: 'application/json' },
      responseType: 'json',
      throwHttpErrors: false,
      timeout: SDK_GATEWAY_REQUEST_TIMEOUT_MS
    })) as typeof response
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] getOperationsCatalog network error`,
      payload: { logStage: 'sdk_operations_network_error', error: msg }
    })
    return {
      ok: false,
      error: {
        code: 'SDK_GATEWAY_NETWORK_ERROR',
        message: sdkErrorMessage('SDK_GATEWAY_NETWORK_ERROR'),
        details: { error: msg }
      },
      requestId: null,
      gatewayHttpStatus: 0
    }
  }

  const requestId = extractRequestId(response.body, response.headers ?? {})
  const gatewayHttpStatus = typeof response.statusCode === 'number' ? response.statusCode : 0

  if (!response.body || typeof response.body !== 'object') {
    return {
      ok: false,
      error: {
        code: 'SDK_GATEWAY_INVALID_RESPONSE',
        message: sdkErrorMessage('SDK_GATEWAY_INVALID_RESPONSE')
      },
      requestId,
      gatewayHttpStatus
    }
  }

  const okFlag = (response.body as Record<string, unknown>).ok === true
  if (okFlag) {
    const data = (response.body as Record<string, unknown>).data
    if (!data || typeof data !== 'object') {
      return {
        ok: false,
        error: {
          code: 'SDK_GATEWAY_INVALID_RESPONSE',
          message: sdkErrorMessage('SDK_GATEWAY_INVALID_RESPONSE')
        },
        requestId,
        gatewayHttpStatus
      }
    }
    const dataObj = data as Record<string, unknown>
    const csv = dataObj.catalogSchemaVersion
    const ops = dataObj.operations
    if (typeof csv !== 'number' || !Array.isArray(ops)) {
      return {
        ok: false,
        error: {
          code: 'SDK_GATEWAY_INVALID_RESPONSE',
          message: sdkErrorMessage('SDK_GATEWAY_INVALID_RESPONSE')
        },
        requestId,
        gatewayHttpStatus
      }
    }
    const operations: GatewayOperationsCatalogEntry[] = []
    for (const item of ops) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      if (
        typeof o.op === 'string' &&
        (o.httpMethod === 'GET' || o.httpMethod === 'POST') &&
        (o.contour === 'new' || o.contour === 'legacy') &&
        (o.availability === 'enabled' ||
          o.availability === 'beta' ||
          o.availability === 'disabled' ||
          o.availability === 'unsupported')
      ) {
        operations.push({
          op: o.op,
          httpMethod: o.httpMethod,
          contour: o.contour,
          availability: o.availability,
          argsSchema: o.argsSchema
        })
      }
    }
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] getOperationsCatalog ok`,
      payload: {
        logStage: 'sdk_operations_ok',
        catalogSchemaVersion: csv,
        operationsCount: operations.length,
        gatewayHttpStatus,
        requestId
      }
    })
    return {
      ok: true,
      catalog: { catalogSchemaVersion: csv, operations },
      requestId,
      gatewayHttpStatus
    }
  }

  const parsedError = parseGatewayErrorBody(response.body)
  if (!parsedError) {
    return {
      ok: false,
      error: {
        code: 'SDK_GATEWAY_INVALID_RESPONSE',
        message: sdkErrorMessage('SDK_GATEWAY_INVALID_RESPONSE')
      },
      requestId,
      gatewayHttpStatus
    }
  }
  return { ok: false, error: parsedError, requestId, gatewayHttpStatus }
}

async function sdkFail(
  ctx: app.Ctx,
  code: string,
  details?: Record<string, unknown>
): Promise<GatewayInvokeResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 4,
    message: `[${LOG_MODULE}] sdk fail ${code}`,
    payload: { logStage: 'sdk_fail', code, details: details ?? {} }
  })
  return {
    ok: false,
    error: {
      code,
      message: sdkErrorMessage(code),
      ...(details ? { details } : {})
    },
    requestId: null,
    warnings: [],
    gatewayHttpStatus: 0
  }
}
