/**
 * Клиент GetCourse gateway для колеса.
 * Все запросы к GetCourse — только через gateway-приложение p/gateways/getcourse.
 * Транспорт: @app/request, responseType:'text' + ручной JSON.parse, throwHttpErrors:false, timeout 15000 ms.
 * Паттерн повторяет gcGatewayClient.lib.ts из p/units/neso.
 */

import { request } from '@app/request'
import * as loggerLib from './logger.lib'
import * as settingsLib from './settings.lib'

const LOG_MODULE = 'lib/getcourse.lib'
const TIMEOUT_MS = 15000

// Тип транспорта для приведения @app/request (платформенный модуль без локальных типов)
type RequestFn = (options: {
  url: string
  method: 'get' | 'post'
  headers: Record<string, string>
  json?: unknown
  responseType: 'text'
  throwHttpErrors: boolean
  timeout: number
}) => Promise<{ statusCode: number; body: unknown }>

// Точка подмены транспорта (инъекция для тестов с мокированным gateway).
let _requestFn: RequestFn = request as unknown as RequestFn

/** Подменить транспорт (для unit-тестов). */
export function _setRequestFn(fn: RequestFn): void {
  _requestFn = fn
}

/** Восстановить реальный транспорт после теста. */
export function _resetRequestFn(): void {
  _requestFn = request as unknown as RequestFn
}

// ---------------------------------------------------------------------------
// Типы
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

/**
 * Результат проверки доступа.
 * allowed: false + transient: false → пользователь не найден / не в группе → 'Вам недоступен этот розыгрыш'
 * allowed: false + transient: true  → инфраструктурный сбой gateway → 'Сервис временно недоступен'
 * allowed: true  → доступ разрешён
 */
export type GatingCheckResult = {
  allowed: boolean
  transient: boolean
}

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

async function getGatewaySettings(ctx: app.Ctx): Promise<{
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

function buildOpUrl(baseUrl: string, op: string): string {
  const noTrailing = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${noTrailing}/v1/${op}`
}

function parseGatewayBody(rawText: string): Record<string, unknown> | null {
  try {
    return rawText.trim() ? (JSON.parse(rawText) as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function extractGatewayResult(parsed: Record<string, unknown>, op: string): GatewayResult {
  if (parsed.ok !== true) {
    const errObj = (parsed.error ?? {}) as Record<string, unknown>
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

async function doGet(
  ctx: app.Ctx,
  op: string,
  query: Record<string, string> = {}
): Promise<GatewayResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] ${op}: вход`,
    payload: {}
  })

  const settings = await getGatewaySettings(ctx)
  if (!settings) {
    await loggerLib.writeServerLog(ctx, {
      severity: 5,
      message: `[${LOG_MODULE}] ${op}: настройки gateway не заданы (SETTINGS_MISSING)`,
      payload: {}
    })
    return {
      ok: false,
      error: { code: 'SETTINGS_MISSING', message: 'Не заполнены настройки интеграции с GetCourse' }
    }
  }

  const { baseUrl, schoolHost, schoolApiKey } = settings
  const baseOpUrl = buildOpUrl(baseUrl, op)
  const queryString =
    Object.keys(query).length > 0 ? '?' + new URLSearchParams(query).toString() : ''
  const url = baseOpUrl + queryString

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] ${op}: запрос GET`,
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
    const code = isTimeout ? 'INVOKE_GC_TIMEOUT' : 'INVOKE_GC_NETWORK_ERROR'
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] ${op}: ${isTimeout ? 'таймаут' : 'ошибка сети'}`,
        payload: { error: msg }
      })
    } catch (_) {}
    return { ok: false, error: { code, message: msg } }
  }

  const parsed = parseGatewayBody(rawText)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] ${op}: ответ`,
    payload: { statusCode, ok: !!(parsed && parsed.ok === true) }
  })

  if (!parsed) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] ${op}: невалидный JSON от гейтвея`,
        payload: { httpStatus: statusCode }
      })
    } catch (_) {}
    return {
      ok: false,
      error: { code: 'INVALID_RESPONSE', message: 'Некорректный ответ гейтвея (не JSON)' }
    }
  }

  const result = extractGatewayResult(parsed, op)
  if (!result.ok) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] ${op}: ошибка гейтвея`,
        payload: { code: result.error.code }
      })
    } catch (_) {}
  }
  return result
}

async function doPost(ctx: app.Ctx, op: string, body: unknown): Promise<GatewayResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] ${op}: вход`,
    payload: {}
  })

  const settings = await getGatewaySettings(ctx)
  if (!settings) {
    await loggerLib.writeServerLog(ctx, {
      severity: 5,
      message: `[${LOG_MODULE}] ${op}: настройки gateway не заданы (SETTINGS_MISSING)`,
      payload: {}
    })
    return {
      ok: false,
      error: { code: 'SETTINGS_MISSING', message: 'Не заполнены настройки интеграции с GetCourse' }
    }
  }

  const { baseUrl, schoolHost, schoolApiKey } = settings
  const url = buildOpUrl(baseUrl, op)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] ${op}: запрос POST`,
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
      json: body,
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
    const code = isTimeout ? 'INVOKE_GC_TIMEOUT' : 'INVOKE_GC_NETWORK_ERROR'
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] ${op}: ${isTimeout ? 'таймаут' : 'ошибка сети'}`,
        payload: { error: msg }
      })
    } catch (_) {}
    return { ok: false, error: { code, message: msg } }
  }

  const parsed = parseGatewayBody(rawText)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] ${op}: ответ`,
    payload: { statusCode, ok: !!(parsed && parsed.ok === true) }
  })

  if (!parsed) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] ${op}: невалидный JSON от гейтвея`,
        payload: { httpStatus: statusCode }
      })
    } catch (_) {}
    return {
      ok: false,
      error: { code: 'INVALID_RESPONSE', message: 'Некорректный ответ гейтвея (не JSON)' }
    }
  }

  const result = extractGatewayResult(parsed, op)
  if (!result.ok) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] ${op}: ошибка гейтвея`,
        payload: { code: result.error.code }
      })
    } catch (_) {}
  }
  return result
}

// ---------------------------------------------------------------------------
// Публичные функции
// ---------------------------------------------------------------------------

/**
 * GET /v1/getAllGroups — список групп школы {id, name}[].
 * Операция может быть disabled (вернёт INVOKE_OP_DISABLED).
 */
export async function getGroups(ctx: app.Ctx): Promise<GatewayResult> {
  const result = await doGet(ctx, 'getAllGroups')
  if (result.ok) {
    // data — массив объектов {id, name} или обёртка; нормализуем как есть
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] getGroups: успех`,
      payload: {}
    })
  }
  return result
}

/**
 * GET /v1/getUserFields?email=... — поля пользователя.
 * ok:false + INVOKE_GC_SEMANTIC_ERROR → пользователь не найден.
 */
export async function userGetFields(ctx: app.Ctx, email: string): Promise<GatewayResult> {
  return doGet(ctx, 'getUserFields', { email })
}

/**
 * GET /v1/getUserGroups?email=... — id групп пользователя (number[]).
 * Операция может быть disabled (вернёт INVOKE_OP_DISABLED).
 */
export async function userGetGroups(ctx: app.Ctx, email: string): Promise<GatewayResult> {
  return doGet(ctx, 'getUserGroups', { email })
}

/**
 * POST /v1/createDeal — создать заказ в GetCourse.
 * Тело: { params: { user: { email }, deal: { offer_id, deal_cost, deal_status } } }
 * Перед запросом проверяет Number.isFinite(Number(offerId)) — §16.7.
 * Если offerId не приводится к конечному числу — возвращает ok:false без HTTP-запроса.
 */
export async function createDeal(
  ctx: app.Ctx,
  params: { email: string; offerId: string; cost: number; status: string }
): Promise<GatewayResult> {
  const offerIdNum = Number(params.offerId)
  if (!Number.isFinite(offerIdNum)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] createDeal: offerId не является конечным числом — запрос не отправляется`,
      payload: { offerId: params.offerId }
    })
    return {
      ok: false,
      error: { code: 'INVALID_OFFER_ID', message: 'offerId не является конечным числом' }
    }
  }

  const body = {
    params: {
      user: { email: params.email },
      deal: {
        offer_id: offerIdNum,
        deal_cost: params.cost,
        deal_status: params.status
      }
    }
  }
  return doPost(ctx, 'createDeal', body)
}

// ---------------------------------------------------------------------------
// Проверки доступа (§16.8)
// ---------------------------------------------------------------------------

/**
 * Проверяет, найден ли пользователь в GetCourse (userGetFields).
 * Возвращает GatingCheckResult:
 *   { allowed: true, transient: false }   — пользователь найден
 *   { allowed: false, transient: false }  — пользователь не найден (INVOKE_GC_SEMANTIC_ERROR)
 *   { allowed: false, transient: true }   — инфраструктурный сбой (fail-closed)
 */
export async function passesGcUserCheck(ctx: app.Ctx, email: string): Promise<GatingCheckResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] passesGcUserCheck: проверка пользователя`,
    payload: { hasEmail: true }
  })

  let r: GatewayResult
  try {
    r = await userGetFields(ctx, email)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] passesGcUserCheck: неожиданное исключение`,
        payload: { error: msg }
      })
    } catch (_) {}
    return { allowed: false, transient: true }
  }

  if (r.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] passesGcUserCheck: пользователь найден`,
      payload: {}
    })
    return { allowed: true, transient: false }
  }

  if (r.error.code === 'INVOKE_GC_SEMANTIC_ERROR') {
    await loggerLib.writeServerLog(ctx, {
      severity: 5,
      message: `[${LOG_MODULE}] passesGcUserCheck: пользователь не найден (SEMANTIC_ERROR)`,
      payload: {}
    })
    return { allowed: false, transient: false }
  }

  // Инфраструктурный сбой — fail-closed
  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] passesGcUserCheck: сбой gateway (fail-closed)`,
      payload: { code: r.error.code }
    })
  } catch (_) {}
  return { allowed: false, transient: true }
}

/**
 * Проверяет, состоит ли пользователь хотя бы в одной из requiredGroupIds (userGetGroups).
 * Возвращает GatingCheckResult:
 *   { allowed: true, transient: false }   — состоит в группе
 *   { allowed: false, transient: false }  — не состоит / INVOKE_GC_SEMANTIC_ERROR
 *   { allowed: false, transient: true }   — инфраструктурный сбой (fail-closed)
 */
export async function passesGcGroupCheck(
  ctx: app.Ctx,
  email: string,
  requiredGroupIds: number[]
): Promise<GatingCheckResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] passesGcGroupCheck: проверка групп`,
    payload: { hasEmail: true, requiredCount: requiredGroupIds.length }
  })

  let r: GatewayResult
  try {
    r = await userGetGroups(ctx, email)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] passesGcGroupCheck: неожиданное исключение`,
        payload: { error: msg }
      })
    } catch (_) {}
    return { allowed: false, transient: true }
  }

  if (r.ok) {
    // Извлекаем id групп пользователя
    const data = r.data
    const userGroupIds: number[] = Array.isArray(data)
      ? data
          .map((v: unknown) => {
            const n = typeof v === 'number' ? v : parseInt(String(v), 10)
            return Number.isFinite(n) ? n : null
          })
          .filter((n): n is number => n !== null)
      : []

    const hasIntersection = requiredGroupIds.some((id) => userGroupIds.includes(id))
    if (hasIntersection) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_MODULE}] passesGcGroupCheck: пользователь в группе`,
        payload: {}
      })
      return { allowed: true, transient: false }
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 5,
      message: `[${LOG_MODULE}] passesGcGroupCheck: нет пересечения с required группами`,
      payload: {}
    })
    return { allowed: false, transient: false }
  }

  if (r.error.code === 'INVOKE_GC_SEMANTIC_ERROR') {
    await loggerLib.writeServerLog(ctx, {
      severity: 5,
      message: `[${LOG_MODULE}] passesGcGroupCheck: SEMANTIC_ERROR (пользователь не найден)`,
      payload: {}
    })
    return { allowed: false, transient: false }
  }

  // Инфраструктурный сбой — fail-closed
  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] passesGcGroupCheck: сбой gateway (fail-closed)`,
      payload: { code: r.error.code }
    })
  } catch (_) {}
  return { allowed: false, transient: true }
}
