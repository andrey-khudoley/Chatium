/**
 * Клиент исходящих вызовов к GC-гейтвею.
 * GET /v1/getOffers, POST /v1/createDeal.
 * Transport — @app/request, responseType:'text' + ручной JSON.parse.
 * Точка подмены транспорта: _requestFn (для тестов).
 */

import { request } from '@app/request'
import * as loggerLib from '../logger.lib'
import * as settingsLib from '../settings.lib'

const LOG_MODULE = 'lib/gateway/gcGatewayClient.lib'
const TIMEOUT_MS = 15000

// ---------------------------------------------------------------------------
// Типы ответа
// ---------------------------------------------------------------------------

export type GatewayOkResult = {
  ok: true
  data: unknown
  requestId?: string
}

export type GatewayErrorResult = {
  ok: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  requestId?: string
}

export type GatewayResult = GatewayOkResult | GatewayErrorResult

// ---------------------------------------------------------------------------
// Точка подмены транспорта (инъекция для тестов)
// ---------------------------------------------------------------------------

type RequestFn = (options: {
  url: string
  method: 'get' | 'post'
  headers: Record<string, string>
  json?: unknown
  responseType: 'text'
  throwHttpErrors: boolean
  timeout: number
}) => Promise<{ statusCode: number; body: unknown }>

let _requestFn: RequestFn = request as unknown as RequestFn

export function _setRequestFn(fn: RequestFn): void {
  _requestFn = fn
}

export function _resetRequestFn(): void {
  _requestFn = request as unknown as RequestFn
}

// ---------------------------------------------------------------------------
// Классификация ошибки гейтвея
// ---------------------------------------------------------------------------

export function classifyGatewayError(error: { code: string; message: string }): string {
  switch (error.code) {
    case 'INVOKE_GC_TIMEOUT':
      return 'Превышено время ожидания ответа от GetCourse'
    case 'INVOKE_GC_NETWORK_ERROR':
      return 'Ошибка сети при обращении к GetCourse'
    case 'INVOKE_GC_UPSTREAM_ERROR':
      return `Ошибка GetCourse: ${error.message}`
    case 'INVOKE_GC_SEMANTIC_ERROR':
      return `Семантическая ошибка GetCourse: ${error.message}`
    case 'INVOKE_GC_LIMIT_ERROR':
      return `Лимит GetCourse превышен: ${error.message}`
    case 'GATEWAY_DEV_KEY_NOT_CONFIGURED':
      return 'Гейтвей: не настроен developer API key'
    case 'SETTINGS_MISSING':
      return 'Не заполнены настройки интеграции с GetCourse'
    default:
      return error.message || `Ошибка гейтвея: ${error.code}`
  }
}

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

async function getSettings(ctx: app.Ctx): Promise<{
  baseUrl: string
  schoolHost: string
  schoolApiKey: string
} | null> {
  const [baseUrl, schoolHost, schoolApiKey] = await Promise.all([
    settingsLib.getGatewayBaseUrl(ctx),
    settingsLib.getGcSchoolHost(ctx),
    settingsLib.getGcSchoolApiKey(ctx)
  ])

  if (!baseUrl || !schoolHost || !schoolApiKey) {
    return null
  }

  return { baseUrl, schoolHost, schoolApiKey }
}

function buildUrl(baseUrl: string, op: string): string {
  const noTrailing = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${noTrailing}/v1/${op}`
}

function parseGatewayResponse(rawText: string): Record<string, unknown> | null {
  try {
    return rawText.trim() ? (JSON.parse(rawText) as Record<string, unknown>) : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// callGetOffers
// ---------------------------------------------------------------------------

export async function callGetOffers(ctx: app.Ctx): Promise<GatewayResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] callGetOffers: вход`,
    payload: {}
  })

  const settings = await getSettings(ctx)
  if (!settings) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] callGetOffers: настройки не заданы`,
      payload: { schoolApiKeyLength: 0 }
    })
    return {
      ok: false,
      error: { code: 'SETTINGS_MISSING', message: 'Не заполнены настройки интеграции с GetCourse' }
    }
  }

  const { baseUrl, schoolHost, schoolApiKey } = settings
  const url = buildUrl(baseUrl, 'getOffers')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] callGetOffers: инициализация запроса`,
    payload: { url, schoolHost, schoolApiKeyLength: schoolApiKey.length }
  })

  let rawText: string
  let statusCode: number
  try {
    const response = await _requestFn({
      url,
      method: 'get',
      headers: {
        'X-Gc-School-Host': schoolHost,
        'X-Gc-School-Api-Key': schoolApiKey
      },
      responseType: 'text',
      throwHttpErrors: false,
      timeout: TIMEOUT_MS
    })
    rawText = typeof response.body === 'string' ? response.body : ''
    statusCode = response.statusCode
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    const isTimeout =
      msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out')
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] callGetOffers: ${isTimeout ? 'таймаут' : 'ошибка сети'}`,
      payload: { error: msg }
    })
    const code = isTimeout ? 'INVOKE_GC_TIMEOUT' : 'INVOKE_GC_NETWORK_ERROR'
    return { ok: false, error: { code, message: msg } }
  }

  const parsed = parseGatewayResponse(rawText)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] callGetOffers: ответ`,
    payload: { statusCode, ok: !!(parsed && parsed.ok === true) }
  })

  if (!parsed) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] callGetOffers: невалидный JSON от гейтвея`,
        payload: { op: 'getOffers', httpStatus: statusCode }
      })
    } catch (_) {}
    return {
      ok: false,
      error: { code: 'INVALID_RESPONSE', message: 'Некорректный ответ гейтвея (не JSON)' }
    }
  }

  if (parsed.ok !== true) {
    const errObj = (parsed.error ?? {}) as Record<string, unknown>
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] callGetOffers: ошибка гейтвея`,
        payload: {
          op: 'getOffers',
          code: typeof errObj.code === 'string' ? errObj.code : undefined
        }
      })
    } catch (_) {}
    return {
      ok: false,
      error: {
        code: typeof errObj.code === 'string' ? errObj.code : 'GATEWAY_ERROR',
        message: typeof errObj.message === 'string' ? errObj.message : 'Ошибка гейтвея',
        details: errObj.details
      },
      requestId: typeof parsed.requestId === 'string' ? parsed.requestId : undefined
    }
  }

  return {
    ok: true,
    data: parsed.data,
    requestId: typeof parsed.requestId === 'string' ? parsed.requestId : undefined
  }
}

// ---------------------------------------------------------------------------
// callCreateDeal
// ---------------------------------------------------------------------------

export async function callCreateDeal(ctx: app.Ctx, params: unknown): Promise<GatewayResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] callCreateDeal: вход`,
    payload: {}
  })

  const settings = await getSettings(ctx)
  if (!settings) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] callCreateDeal: настройки не заданы`,
      payload: { schoolApiKeyLength: 0 }
    })
    return {
      ok: false,
      error: { code: 'SETTINGS_MISSING', message: 'Не заполнены настройки интеграции с GetCourse' }
    }
  }

  const { baseUrl, schoolHost, schoolApiKey } = settings
  const url = buildUrl(baseUrl, 'createDeal')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] callCreateDeal: инициализация запроса`,
    payload: { url, schoolHost, schoolApiKeyLength: schoolApiKey.length }
  })

  let rawText: string
  let statusCode: number
  try {
    const response = await _requestFn({
      url,
      method: 'post',
      headers: {
        'X-Gc-School-Host': schoolHost,
        'X-Gc-School-Api-Key': schoolApiKey,
        'Content-Type': 'application/json; charset=utf-8'
      },
      json: { params },
      responseType: 'text',
      throwHttpErrors: false,
      timeout: TIMEOUT_MS
    })
    rawText = typeof response.body === 'string' ? response.body : ''
    statusCode = response.statusCode
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    const isTimeout =
      msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out')
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] callCreateDeal: ${isTimeout ? 'таймаут' : 'ошибка сети'}`,
      payload: { error: msg }
    })
    const code = isTimeout ? 'INVOKE_GC_TIMEOUT' : 'INVOKE_GC_NETWORK_ERROR'
    return { ok: false, error: { code, message: msg } }
  }

  const parsed = parseGatewayResponse(rawText)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] callCreateDeal: ответ`,
    payload: { statusCode, ok: !!(parsed && parsed.ok === true) }
  })

  if (!parsed) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] callCreateDeal: невалидный JSON от гейтвея`,
        payload: { op: 'createDeal', httpStatus: statusCode }
      })
    } catch (_) {}
    return {
      ok: false,
      error: { code: 'INVALID_RESPONSE', message: 'Некорректный ответ гейтвея (не JSON)' }
    }
  }

  if (parsed.ok !== true) {
    const errObj = (parsed.error ?? {}) as Record<string, unknown>
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] callCreateDeal: ошибка гейтвея`,
        payload: {
          op: 'createDeal',
          code: typeof errObj.code === 'string' ? errObj.code : undefined
        }
      })
    } catch (_) {}
    return {
      ok: false,
      error: {
        code: typeof errObj.code === 'string' ? errObj.code : 'GATEWAY_ERROR',
        message: typeof errObj.message === 'string' ? errObj.message : 'Ошибка гейтвея',
        details: errObj.details
      },
      requestId: typeof parsed.requestId === 'string' ? parsed.requestId : undefined
    }
  }

  return {
    ok: true,
    data: parsed.data,
    requestId: typeof parsed.requestId === 'string' ? parsed.requestId : undefined
  }
}
