import { request } from '@app/request'
import * as loggerLib from './logger.lib'
import * as settingsLib from './settings.lib'

const LOG_MODULE = 'lib/getcourse.lib'

// ---------------------------------------------------------------------------
// Base64 (полностью самодостаточная реализация — Node/браузер/sandbox)
// ---------------------------------------------------------------------------

type OptionalGlobalBuffer = {
  from(data: string, encoding: 'utf8'): { toString(encoding: 'base64'): string }
}

function encodeBase64(str: string): string {
  const nodeBuffer = (globalThis as { Buffer?: OptionalGlobalBuffer }).Buffer
  if (nodeBuffer) {
    return nodeBuffer.from(str, 'utf8').toString('base64')
  }
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(str)))
  }

  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const utf8Bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i)
    if (charCode < 0x80) {
      utf8Bytes.push(charCode)
    } else if (charCode < 0x800) {
      utf8Bytes.push(0xc0 | (charCode >> 6))
      utf8Bytes.push(0x80 | (charCode & 0x3f))
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      utf8Bytes.push(0xe0 | (charCode >> 12))
      utf8Bytes.push(0x80 | ((charCode >> 6) & 0x3f))
      utf8Bytes.push(0x80 | (charCode & 0x3f))
    } else {
      i++
      const surrogate = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff))
      utf8Bytes.push(0xf0 | (surrogate >> 18))
      utf8Bytes.push(0x80 | ((surrogate >> 12) & 0x3f))
      utf8Bytes.push(0x80 | ((surrogate >> 6) & 0x3f))
      utf8Bytes.push(0x80 | (surrogate & 0x3f))
    }
  }

  let result = ''
  for (let i = 0; i < utf8Bytes.length; i += 3) {
    const byte1 = utf8Bytes[i] ?? 0
    const byte2 = i + 1 < utf8Bytes.length ? (utf8Bytes[i + 1] ?? 0) : 0
    const byte3 = i + 2 < utf8Bytes.length ? (utf8Bytes[i + 2] ?? 0) : 0
    const enc1 = byte1 >> 2
    const enc2 = ((byte1 & 0x3) << 4) | (byte2 >> 4)
    const enc3 = ((byte2 & 0xf) << 2) | (byte3 >> 6)
    const enc4 = byte3 & 0x3f
    result += base64Chars[enc1] + base64Chars[enc2]
    result += i + 1 < utf8Bytes.length ? base64Chars[enc3] : '='
    result += i + 2 < utf8Bytes.length ? base64Chars[enc4] : '='
  }
  return result
}

// ---------------------------------------------------------------------------
// Нормализация домена
// ---------------------------------------------------------------------------

export function normalizeGcAccountDomain(raw: string): string {
  let s = raw.trim()
  if (!s) return ''
  s = s.replace(/^https?:\/\//i, '')
  const slash = s.indexOf('/')
  if (slash >= 0) s = s.slice(0, slash)
  return s.replace(/\/+$/, '')
}

/**
 * Формирует полный URL для pl/api/deals.
 * Если домен не содержит точку — считаем поддоменом getcourse.ru.
 */
function buildDealsUrl(domain: string): string {
  const normalized = normalizeGcAccountDomain(domain)
  if (!normalized) return ''
  if (normalized.includes('.')) {
    return `https://${normalized}/pl/api/deals`
  }
  return `https://${normalized}.getcourse.ru/pl/api/deals`
}

// ---------------------------------------------------------------------------
// Разбор ответа PL API
// ---------------------------------------------------------------------------

export type GcPlApiResult = {
  ok: boolean
  detail: string
  dealId?: string
  dealNumber?: string
  userId?: string
  paymentLink?: string
  errorMessage?: string
}

/**
 * HTTP 200 при ошибке в теле — норма для GetCourse.
 * Проверяем верхний `success` и вложенный `result.success` / `result.error`.
 */
function parsePlDealsResponse(body: unknown): GcPlApiResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, detail: 'invalid_body' }
  }
  const b = body as Record<string, unknown>
  const topOk = b.success === true || b.success === 'true'
  if (!topOk) {
    return { ok: false, detail: `success=${String(b.success)}` }
  }
  const result = b.result
  if (typeof result !== 'object' || result === null) {
    return { ok: true, detail: 'top_only' }
  }
  const r = result as Record<string, unknown>
  if (r.error === true || r.error === 'true') {
    const msg = r.error_message != null ? String(r.error_message) : 'result.error'
    return { ok: false, detail: msg, errorMessage: msg }
  }
  const innerOk = r.success === true || r.success === 'true'
  if (!innerOk) {
    const msg = r.error_message != null ? String(r.error_message) : 'result.success_false'
    return { ok: false, detail: msg, errorMessage: msg }
  }
  return {
    ok: true,
    detail: 'ok',
    dealId: r.deal_id != null ? String(r.deal_id) : undefined,
    dealNumber: r.deal_number != null ? String(r.deal_number) : undefined,
    userId: r.user_id != null ? String(r.user_id) : undefined,
    paymentLink: typeof r.payment_link === 'string' ? r.payment_link : undefined
  }
}

function jsonForLog(value: unknown, maxLen = 12000): string {
  try {
    const str = JSON.stringify(value)
    if (str.length <= maxLen) return str
    return `${str.slice(0, maxLen)}… [truncated]`
  } catch {
    return String(value)
  }
}

// ---------------------------------------------------------------------------
// Проверка ключа API и домена
// ---------------------------------------------------------------------------

export type VerifyGcAccessParams = { apiKey: string; domain: string }

export async function verifyGcAccess(
  ctx: app.Ctx,
  params: VerifyGcAccessParams
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const apiKey = params.apiKey.trim()
  const domain = normalizeGcAccountDomain(params.domain)
  if (!apiKey || !domain) {
    return { ok: false, message: 'Укажите ключ API и домен аккаунта.' }
  }

  const url = buildDealsUrl(domain)
  if (!url) {
    return { ok: false, message: 'Некорректный домен аккаунта.' }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] verifyGcAccess: запрос`,
    payload: { host: domain }
  })

  const paramsObj = {
    user: { email: 'chatium-verify@invalid.local' },
    deal: {
      deal_number: `__verify_${Date.now()}__`,
      deal_status: 'in_work'
    }
  }
  const paramsBase64 = encodeBase64(JSON.stringify(paramsObj))

  let response: { statusCode?: number; body?: unknown }
  try {
    response = await request({
      url,
      method: 'post',
      form: { action: 'add', key: apiKey, params: paramsBase64 },
      responseType: 'json',
      throwHttpErrors: false,
      timeout: 15000
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] verifyGcAccess: сеть`,
      payload: { error: msg }
    })
    return { ok: false, message: `Не удалось подключиться к ${domain}: ${msg}` }
  }

  const statusOk =
    typeof response.statusCode === 'number' &&
    response.statusCode >= 200 &&
    response.statusCode < 300
  if (!statusOk) {
    return {
      ok: false,
      message: `GetCourse ответил HTTP ${String(response.statusCode)}. Проверьте домен.`
    }
  }

  const body = response.body
  if (typeof body !== 'object' || body === null) {
    return { ok: false, message: 'Ответ GetCourse не JSON — проверьте домен.' }
  }

  const raw = JSON.stringify(body).toLowerCase()
  if (raw.includes('неавторизован') || raw.includes('неверный') || raw.includes('запрещ')) {
    return { ok: false, message: 'Ключ API отклонён GetCourse или недостаточно прав.' }
  }

  const parsed = parsePlDealsResponse(body)
  if (parsed.ok) {
    return { ok: true, message: 'Подключение к GetCourse успешно.' }
  }

  if (
    raw.includes('не найден') ||
    raw.includes('not found') ||
    raw.includes('сделк') ||
    raw.includes('пользоват')
  ) {
    return { ok: true, message: 'Ключ принят (тестовая сделка отклонена — ожидаемо).' }
  }

  return { ok: false, message: 'Не удалось однозначно проверить ключ.' }
}

// ---------------------------------------------------------------------------
// Создание заказа (Import API: deals)
// ---------------------------------------------------------------------------

export type CreateDealParams = {
  email: string
  firstName: string
  lastName?: string
  phone?: string
  offerId?: string
  offerCode?: string
  currency?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
}

export type CreateDealResult = {
  ok: boolean
  paymentLink?: string
  dealNumber?: string
  errorMessage?: string
}

export async function createDeal(
  ctx: app.Ctx,
  params: CreateDealParams
): Promise<CreateDealResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] createDeal: вход`,
    payload: { email: params.email, hasPhone: Boolean(params.phone) }
  })

  const domain = (await settingsLib.getGcAccountDomain(ctx)).trim()
  const apiKey = (await settingsLib.getGcApiKey(ctx)).trim()
  const offerId = params.offerId?.trim()
  const offerCode = params.offerCode?.trim() || (await settingsLib.getGcOfferCode(ctx)).trim()
  const price = await settingsLib.getGcPrice(ctx)

  if (!domain || !apiKey) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] createDeal: не заданы gc_account_domain или gc_api_key`,
      payload: { hasDomain: Boolean(domain), hasKey: Boolean(apiKey) }
    })
    return { ok: false, errorMessage: 'Интеграция с GetCourse не настроена.' }
  }
  if (!offerId && !offerCode) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] createDeal: не задан ни offer_id, ни offer_code`,
      payload: {}
    })
    return { ok: false, errorMessage: 'Оффер GetCourse не настроен.' }
  }

  const url = buildDealsUrl(domain)
  if (!url) {
    return { ok: false, errorMessage: 'Некорректный домен аккаунта GetCourse.' }
  }

  const user: Record<string, unknown> = {
    email: params.email,
    first_name: params.firstName
  }
  if (params.lastName) user.last_name = params.lastName
  if (params.phone) user.phone = params.phone

  const deal: Record<string, unknown> = {}
  if (offerId) {
    deal.offer_id = offerId
  } else {
    deal.offer_code = offerCode
  }
  if (price > 0) deal.deal_cost = price
  if (params.currency) deal.deal_currency = params.currency

  const utmSourceFieldId = await settingsLib.getGcUtmFieldId(
    ctx,
    settingsLib.SETTING_KEYS.GC_UTM_SOURCE_FIELD
  )
  const utmMediumFieldId = await settingsLib.getGcUtmFieldId(
    ctx,
    settingsLib.SETTING_KEYS.GC_UTM_MEDIUM_FIELD
  )
  const utmCampaignFieldId = await settingsLib.getGcUtmFieldId(
    ctx,
    settingsLib.SETTING_KEYS.GC_UTM_CAMPAIGN_FIELD
  )
  const utmContentFieldId = await settingsLib.getGcUtmFieldId(
    ctx,
    settingsLib.SETTING_KEYS.GC_UTM_CONTENT_FIELD
  )
  const utmTermFieldId = await settingsLib.getGcUtmFieldId(
    ctx,
    settingsLib.SETTING_KEYS.GC_UTM_TERM_FIELD
  )

  const addfields: Record<string, string> = {}
  if (utmSourceFieldId && params.utmSource) addfields[utmSourceFieldId] = params.utmSource
  if (utmMediumFieldId && params.utmMedium) addfields[utmMediumFieldId] = params.utmMedium
  if (utmCampaignFieldId && params.utmCampaign) addfields[utmCampaignFieldId] = params.utmCampaign
  if (utmContentFieldId && params.utmContent) addfields[utmContentFieldId] = params.utmContent
  if (utmTermFieldId && params.utmTerm) addfields[utmTermFieldId] = params.utmTerm
  if (Object.keys(addfields).length > 0) deal.addfields = addfields

  const session: Record<string, string> = {}
  if (params.utmSource) session.utm_source = params.utmSource
  if (params.utmMedium) session.utm_medium = params.utmMedium
  if (params.utmCampaign) session.utm_campaign = params.utmCampaign
  if (params.utmContent) session.utm_content = params.utmContent
  if (params.utmTerm) session.utm_term = params.utmTerm

  const paramsObj = {
    user,
    system: {
      refresh_if_exists: 1,
      multiple_offers: 1,
      return_payment_link: 1
    },
    session,
    deal
  }

  const paramsBase64 = encodeBase64(JSON.stringify(paramsObj))

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] createDeal: HTTP POST pl/api/deals`,
    payload: { email: params.email, host: domain, paramsLen: paramsBase64.length }
  })

  let response: { statusCode?: number; body?: unknown }
  try {
    response = await request({
      url,
      method: 'post',
      form: { action: 'add', key: apiKey, params: paramsBase64 },
      responseType: 'json',
      throwHttpErrors: false,
      timeout: 15000
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] createDeal: сеть`,
      payload: { email: params.email, error: msg }
    })
    return { ok: false, errorMessage: `Ошибка сети: ${msg}` }
  }

  const parsed = parsePlDealsResponse(response.body)

  await loggerLib.writeServerLog(ctx, {
    severity: parsed.ok ? 6 : 3,
    message: `[${LOG_MODULE}] createDeal: ответ`,
    payload: {
      email: params.email,
      statusCode: response.statusCode,
      parseOk: parsed.ok,
      parseDetail: parsed.detail,
      body: jsonForLog(response.body)
    }
  })

  if (!parsed.ok) {
    return { ok: false, errorMessage: parsed.errorMessage || parsed.detail }
  }

  return {
    ok: true,
    paymentLink: parsed.paymentLink,
    dealNumber: parsed.dealNumber
  }
}
