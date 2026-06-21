import * as repo from '../repos/settings.repo'
import * as loggerLib from './logger.lib'
import {
  buildInternalGatewayBaseUrl,
  getDirectGatewayHostAliases,
  getInternalGatewayPath,
  getLegacyGatewayPaths,
  type PaymentGatewayId
} from '../config/gatewayUrls'

const LOG_MODULE = 'lib/settings.lib'

/** Ключи настроек */
export const SETTING_KEYS = {
  PROJECT_NAME: 'project_name',
  PROJECT_TITLE: 'project_title',
  LOG_LEVEL: 'log_level',
  LOGS_LIMIT: 'logs_limit',
  LOG_WEBHOOK: 'log_webhook',
  DASHBOARD_RESET_AT: 'dashboard_reset_at',
  // LifePay client panel (implementation-plan §1.8.1)
  LP_APIKEY: 'lp_apikey',
  LP_LOGIN: 'lp_login',
  LP_WEBHOOK_TOKEN: 'lp_webhook_token',
  /**
   * Базовый URL gateway LifePay (исторически — единственный gateway,
   * отсюда нейтральное имя ключа `gateway_base_url`). После добавления
   * Lava.Top — синоним `lifepay_base_url`. Доступен через `getGatewayBaseUrl`
   * и `getLifepayBaseUrl` (они читают одну и ту же запись).
   */
  GATEWAY_BASE_URL: 'gateway_base_url',
  // Lava.Top client panel (ребрендинг 2026-05-28: многогейтвейная архитектура)
  LAVA_TEST_APIKEY: 'lava_test_apikey',
  LAVA_BASE_URL: 'lava_base_url',
  LAVA_WEBHOOK_SECRET: 'lava_webhook_secret',
  // GetCourse client panel — третий гейтвей. Имена ключей строго соответствуют
  // контракту gw/gc (`shared/gatewaySettingKeys.ts`): значения подставляются
  // в заголовки `X-Gc-School-Api-Key` и `X-Gc-School-Host` upstream-запроса.
  GC_BASE_URL: 'gc_base_url',
  GC_TEST_SCHOOL_API_KEY: 'gc_test_school_api_key',
  GC_TEST_SCHOOL_HOST: 'gc_test_school_host',
  GC_ENABLED: 'gc_enabled',
  GC_CREATE_PAYMENT: 'gc_create_payment',
  GC_DEAL_STATUS: 'gc_deal_status',
  // Глобальный фильтр панели по дате/времени (один на всё приложение).
  PANEL_DATE_FILTER: 'panel_date_filter',
  // Виджеты для встраивания на сторонние страницы (userscripts/*).
  // Per-method enable/off|whitelist|blacklist/minAmount/maxAmount + фильтр офферов.
  WIDGET_LIFEPAY_ENABLED: 'widget_lifepay_enabled',
  WIDGET_LIFEPAY_MIN: 'widget_lifepay_min',
  WIDGET_LIFEPAY_MAX: 'widget_lifepay_max',
  WIDGET_LIFEPAY_OFFER_LIST_TYPE: 'widget_lifepay_offer_list_type',
  /** @deprecated legacy-ключ string[]; оставлен для fallback-чтения. */
  WIDGET_LIFEPAY_OFFER_IDS: 'widget_lifepay_offer_ids',
  /** Новый ключ AllowedOffer[] JSON. */
  WIDGET_LIFEPAY_OFFERS: 'widget_lifepay_offers',
  WIDGET_LAVATOP_ENABLED: 'widget_lavatop_enabled',
  WIDGET_LAVATOP_MIN: 'widget_lavatop_min',
  WIDGET_LAVATOP_MAX: 'widget_lavatop_max',
  WIDGET_LAVATOP_OFFER_LIST_TYPE: 'widget_lavatop_offer_list_type',
  /** @deprecated legacy-ключ string[]; оставлен для fallback-чтения. */
  WIDGET_LAVATOP_OFFER_IDS: 'widget_lavatop_offer_ids',
  /** Новый ключ AllowedOffer[] JSON. */
  WIDGET_LAVATOP_OFFERS: 'widget_lavatop_offers',
  // Deal-поток Lava.Top: фиксированный оффер и ручные курсы валют
  WIDGET_LAVATOP_OFFER_ID: 'widget_lavatop_offer_id',
  WIDGET_LAVATOP_PRODUCT_ID: 'widget_lavatop_product_id',
  WIDGET_LAVATOP_MANUAL_RATE_USD: 'widget_lavatop_manual_rate_usd',
  WIDGET_LAVATOP_MANUAL_RATE_EUR: 'widget_lavatop_manual_rate_eur',
  // Страница оплаты (payment-page): визуальный конфиг для встраиваемого загрузчика.
  PAYMENT_PAGE_GENERAL: 'payment_page_general',
  PAYMENT_PAGE_METHODS: 'payment_page_methods'
} as const

/** Настройка вебхука логов: enable — активна ли отправка, url — куда отправлять. */
export type LogWebhookSetting = { enable: boolean; url: string }

/**
 * Глобальный фильтр панели по дате/времени (Unix ms). Любая граница может
 * отсутствовать: только from — «всё после», только to — «всё до», обе — диапазон.
 * Пустой объект `{}` означает «фильтр не задан» (показываются все данные).
 */
export type DateFilter = { from?: number; to?: number }

/** Проверяет одну границу фильтра: число, конечное, > 0. */
function isValidBound(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/**
 * Валидирует фильтр дат. Объект; каждая присутствующая граница — корректное
 * число (> 0); если обе заданы — from <= to. Отсутствие границ допустимо.
 */
export function isValidDateFilter(value: unknown): value is DateFilter {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>
  if (o.from !== undefined && !isValidBound(o.from)) return false
  if (o.to !== undefined && !isValidBound(o.to)) return false
  if (isValidBound(o.from) && isValidBound(o.to) && o.from > o.to) return false
  return true
}

/**
 * Нормализует фильтр: оставляет только валидные границы (Math.floor), отбрасывает
 * отсутствующие/невалидные. Возвращает `{}` если ничего валидного нет.
 */
export function normalizeDateFilter(value: unknown): DateFilter {
  if (typeof value !== 'object' || value === null) return {}
  const o = value as Record<string, unknown>
  const result: DateFilter = {}
  if (isValidBound(o.from)) result.from = Math.floor(o.from)
  if (isValidBound(o.to)) result.to = Math.floor(o.to)
  if (result.from !== undefined && result.to !== undefined && result.from > result.to) {
    return {}
  }
  return result
}

/** Значения по умолчанию */
export const DEFAULTS = {
  [SETTING_KEYS.PROJECT_NAME]: 'Payments Client',
  [SETTING_KEYS.PROJECT_TITLE]: 'Payments Client',
  [SETTING_KEYS.LOG_LEVEL]: 'Info',
  [SETTING_KEYS.LOGS_LIMIT]: '100',
  [SETTING_KEYS.LOG_WEBHOOK]: { enable: false, url: '' } as LogWebhookSetting,
  [SETTING_KEYS.DASHBOARD_RESET_AT]: null as number | null,
  [SETTING_KEYS.LP_APIKEY]: '',
  [SETTING_KEYS.LP_LOGIN]: '',
  [SETTING_KEYS.LP_WEBHOOK_TOKEN]: '',
  [SETTING_KEYS.GATEWAY_BASE_URL]: '',
  [SETTING_KEYS.LAVA_TEST_APIKEY]: '',
  [SETTING_KEYS.LAVA_BASE_URL]: '',
  [SETTING_KEYS.LAVA_WEBHOOK_SECRET]: '',
  [SETTING_KEYS.GC_BASE_URL]: '',
  [SETTING_KEYS.GC_TEST_SCHOOL_API_KEY]: '',
  [SETTING_KEYS.GC_TEST_SCHOOL_HOST]: '',
  [SETTING_KEYS.GC_ENABLED]: 'false',
  [SETTING_KEYS.GC_CREATE_PAYMENT]: 'true',
  [SETTING_KEYS.GC_DEAL_STATUS]: 'payed',
  [SETTING_KEYS.WIDGET_LIFEPAY_ENABLED]: 'false',
  [SETTING_KEYS.WIDGET_LIFEPAY_MIN]: '0',
  [SETTING_KEYS.WIDGET_LIFEPAY_MAX]: '0',
  [SETTING_KEYS.WIDGET_LIFEPAY_OFFER_LIST_TYPE]: 'off',
  [SETTING_KEYS.WIDGET_LIFEPAY_OFFER_IDS]: '[]',
  [SETTING_KEYS.WIDGET_LIFEPAY_OFFERS]: '[]',
  [SETTING_KEYS.WIDGET_LAVATOP_ENABLED]: 'false',
  [SETTING_KEYS.WIDGET_LAVATOP_MIN]: '0',
  [SETTING_KEYS.WIDGET_LAVATOP_MAX]: '0',
  [SETTING_KEYS.WIDGET_LAVATOP_OFFER_LIST_TYPE]: 'off',
  [SETTING_KEYS.WIDGET_LAVATOP_OFFER_IDS]: '[]',
  [SETTING_KEYS.WIDGET_LAVATOP_OFFERS]: '[]',
  [SETTING_KEYS.WIDGET_LAVATOP_OFFER_ID]: '',
  [SETTING_KEYS.WIDGET_LAVATOP_PRODUCT_ID]: '',
  [SETTING_KEYS.WIDGET_LAVATOP_MANUAL_RATE_USD]: '',
  [SETTING_KEYS.WIDGET_LAVATOP_MANUAL_RATE_EUR]: '',
  [SETTING_KEYS.PAYMENT_PAGE_GENERAL]: {
    enabled: false,
    accentColor: '#f85c50'
  } as Record<string, unknown>,
  [SETTING_KEYS.PAYMENT_PAGE_METHODS]: {} as Record<string, unknown>
} as const

/** Минимальная длина webhook-токена (implementation-plan §1.8.1: ≥ 32 байт). */
export const LP_WEBHOOK_TOKEN_MIN_LENGTH = 32

/** Валидация login по §2.5 manual: 11 цифр, первая 7. */
export function isValidLpLogin(value: string): boolean {
  return /^7\d{10}$/.test(value)
}

/** Валидация base URL (http(s)://..., без trailing slash) — общая для всех гейтвеев. */
export function normalizeGatewayBaseUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const noTrailing = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
  return noTrailing
}

function rewriteConfiguredGatewayPath(gatewayId: PaymentGatewayId, pathname: string): string {
  const currentPath = getInternalGatewayPath(gatewayId)
  for (const legacyPath of getLegacyGatewayPaths(gatewayId)) {
    if (pathname === legacyPath) return currentPath
    if (pathname.startsWith(`${legacyPath}/`)) {
      return `${currentPath}${pathname.slice(legacyPath.length)}`
    }
  }
  return pathname
}

/**
 * Нормализует сохранённую настройку gateway URL:
 * - обрезает trailing slash;
 * - переписывает legacy-root на текущий root из config/gatewayUrls;
 * - значения из DIRECT_GATEWAY_HOST_ALIASES превращает в auto-mode.
 */
export function normalizeGatewayBaseUrlSetting(gatewayId: PaymentGatewayId, value: string): string {
  const normalized = normalizeGatewayBaseUrl(value)
  if (!normalized) return ''
  try {
    const url = new URL(normalized)
    if (getDirectGatewayHostAliases(gatewayId).includes(url.hostname)) {
      return ''
    }
    url.pathname = rewriteConfiguredGatewayPath(gatewayId, url.pathname)
    return normalizeGatewayBaseUrl(url.toString())
  } catch {
    return rewriteConfiguredGatewayPath(gatewayId, normalized)
  }
}

export function resolveGatewayBaseUrl(
  ctx: app.Ctx,
  gatewayId: PaymentGatewayId,
  value: string
): string {
  return (
    normalizeGatewayBaseUrlSetting(gatewayId, value) || buildInternalGatewayBaseUrl(ctx, gatewayId)
  )
}

export function normalizeLifepayGatewayBaseUrl(value: string): string {
  return normalizeGatewayBaseUrlSetting('lifepay', value)
}

export function normalizeLavaBaseUrl(value: string): string {
  return normalizeGatewayBaseUrlSetting('lavatop', value)
}

export function normalizeGcGatewayBaseUrl(value: string): string {
  return normalizeGatewayBaseUrlSetting('gc', value)
}

export function isValidGatewayBaseUrl(value: string): boolean {
  if (!value) return false
  return /^https?:\/\/[^\s]+$/.test(value)
}

export const isValidLavaBaseUrl = isValidGatewayBaseUrl

/**
 * Валидатор хоста тестовой школы GetCourse: hostname без схемы и слешей,
 * допустимые символы — буквы/цифры/дефис, точечная нотация. Применяется к
 * `gc_test_school_host` (значение уходит в заголовок `X-Gc-School-Host`).
 * `isValidGatewayBaseUrl` сюда не подходит: ожидаемое значение — `school.getcourse.ru`,
 * без `http://` (§2.5 manual GC).
 */
export function isValidGcSchoolHost(value: string): boolean {
  if (!value) return false
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(value)
}

/** Минимальная длина webhook-секрета Lava.Top: 16 символов (по аналогии с gateway). */
export const LAVA_WEBHOOK_SECRET_MIN_LENGTH = 16

/** Допустимые уровни логирования */
export const LOG_LEVELS = ['Debug', 'Info', 'Warn', 'Error', 'Disable'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && LOG_LEVELS.includes(value as LogLevel)
}

export function parseLogsLimit(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  const n = typeof value === 'string' ? parseInt(value, 10) : NaN
  return !isNaN(n) && n > 0 ? n : 100
}

/** getSetting не логирует через writeServerLog — вызывается из logger.lib (getLogLevel, getLogWebhook), рекурсия. */
export async function getSetting(ctx: app.Ctx, key: string): Promise<unknown> {
  const row = await repo.findByKey(ctx, key)
  if (row && row.value !== undefined && row.value !== null) {
    return row.value
  }
  return (DEFAULTS as Record<string, unknown>)[key] ?? null
}

/** Читает только сохранённое значение без fallback из DEFAULTS. */
export async function getStoredSetting(ctx: app.Ctx, key: string): Promise<unknown | null> {
  const row = await repo.findByKey(ctx, key)
  if (row && row.value !== undefined && row.value !== null) {
    return row.value
  }
  return null
}

/**
 * Получить настройку как строку.
 */
export async function getSettingString(ctx: app.Ctx, key: string): Promise<string> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getSettingString entry`,
    payload: { key }
  })
  const value = await getSetting(ctx, key)
  const result =
    typeof value === 'string' ? value : String((DEFAULTS as Record<string, unknown>)[key] ?? '')
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getSettingString exit`,
    payload: { key, value, result }
  })
  return result
}

/** getLogLevel не логирует через writeServerLog — вызывается из logger.lib, рекурсия. */
export async function getLogLevel(ctx: app.Ctx): Promise<LogLevel> {
  const value = await getSetting(ctx, SETTING_KEYS.LOG_LEVEL)
  return isLogLevel(value) ? value : (DEFAULTS[SETTING_KEYS.LOG_LEVEL] as LogLevel)
}

/**
 * Получить лимит логов (число).
 */
export async function getLogsLimit(ctx: app.Ctx): Promise<number> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getLogsLimit entry`,
    payload: {}
  })
  const value = await getSetting(ctx, SETTING_KEYS.LOGS_LIMIT)
  const result = parseLogsLimit(value)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getLogsLimit exit`,
    payload: { value, result }
  })
  return result
}

function isLogWebhook(value: unknown): value is LogWebhookSetting {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>
  return typeof o.enable === 'boolean' && typeof o.url === 'string'
}

/** getLogWebhook не логирует через writeServerLog — вызывается из logger.lib, рекурсия. */
export async function getLogWebhook(ctx: app.Ctx): Promise<LogWebhookSetting> {
  const value = await getSetting(ctx, SETTING_KEYS.LOG_WEBHOOK)
  return isLogWebhook(value) ? value : DEFAULTS[SETTING_KEYS.LOG_WEBHOOK]
}

/**
 * Получить таймштамп сброса дашборда (Unix ms). При отсутствии — 0 (учитываются все логи).
 */
export async function getDashboardResetAt(ctx: app.Ctx): Promise<number> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getDashboardResetAt entry`,
    payload: {}
  })
  const value = await getSetting(ctx, SETTING_KEYS.DASHBOARD_RESET_AT)
  const result =
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getDashboardResetAt exit`,
    payload: { value, result }
  })
  return result
}

/**
 * Получить глобальный фильтр панели по дате/времени. При отсутствии или невалидных
 * данных возвращает `{}` (фильтр не задан). Гарантирует только валидные границы.
 */
export async function getPanelDateFilter(ctx: app.Ctx): Promise<DateFilter> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getPanelDateFilter entry`,
    payload: {}
  })
  const value = await getSetting(ctx, SETTING_KEYS.PANEL_DATE_FILTER)
  const result = isValidDateFilter(value) ? normalizeDateFilter(value) : {}
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getPanelDateFilter exit`,
    payload: { from: result.from ?? null, to: result.to ?? null }
  })
  return result
}

/**
 * Получить все настройки в виде объекта ключ-значение (с дефолтами).
 */
export async function getAllSettings(ctx: app.Ctx): Promise<Record<string, unknown>> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getAllSettings entry`,
    payload: {}
  })
  const rows = await repo.findAll(ctx)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getAllSettings repo.findAll result`,
    payload: { rowsCount: rows.length, keys: rows.map((r) => r.key) }
  })
  const result = { ...DEFAULTS } as Record<string, unknown>
  for (const row of rows) {
    if (row.key && row.value !== undefined && row.value !== null) {
      result[row.key] = row.value
    }
  }
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getAllSettings exit`,
    payload: { resultKeys: Object.keys(result) }
  })
  return result
}

/**
 * Получить значение настройки LifePay как trim-строку (или пустую строку).
 * Не логирует значение (секреты не должны попадать в payload).
 */
async function getStringSettingRaw(ctx: app.Ctx, key: string): Promise<string> {
  const value = await getSetting(ctx, key)
  return typeof value === 'string' ? value.trim() : ''
}

/** Получить lp_apikey без логирования значения (только наличие). */
export async function getLpApikey(ctx: app.Ctx): Promise<string> {
  return getStringSettingRaw(ctx, SETTING_KEYS.LP_APIKEY)
}

/** Получить lp_login. */
export async function getLpLogin(ctx: app.Ctx): Promise<string> {
  return getStringSettingRaw(ctx, SETTING_KEYS.LP_LOGIN)
}

/** Получить lp_webhook_token без логирования значения. */
export async function getLpWebhookToken(ctx: app.Ctx): Promise<string> {
  return getStringSettingRaw(ctx, SETTING_KEYS.LP_WEBHOOK_TOKEN)
}

/** Получить gateway_base_url (LifePay; имя ключа историческое). */
export async function getGatewayBaseUrl(ctx: app.Ctx): Promise<string> {
  return resolveGatewayBaseUrl(
    ctx,
    'lifepay',
    await getStringSettingRaw(ctx, SETTING_KEYS.GATEWAY_BASE_URL)
  )
}

/** Алиас `getGatewayBaseUrl` под именем LifePay — для симметрии с Lava.Top. */
export async function getLifepayBaseUrl(ctx: app.Ctx): Promise<string> {
  return getGatewayBaseUrl(ctx)
}

/** Получить lava_test_apikey (без логирования значения). */
export async function getLavaTestApikey(ctx: app.Ctx): Promise<string> {
  return getStringSettingRaw(ctx, SETTING_KEYS.LAVA_TEST_APIKEY)
}

/** Получить lava_base_url. */
export async function getLavaBaseUrl(ctx: app.Ctx): Promise<string> {
  return resolveGatewayBaseUrl(
    ctx,
    'lavatop',
    await getStringSettingRaw(ctx, SETTING_KEYS.LAVA_BASE_URL)
  )
}

/** Получить lava_webhook_secret (без логирования значения). */
export async function getLavaWebhookSecret(ctx: app.Ctx): Promise<string> {
  return getStringSettingRaw(ctx, SETTING_KEYS.LAVA_WEBHOOK_SECRET)
}

/** Получить gc_base_url — базовый URL GC-гейтвея. */
export async function getGcBaseUrl(ctx: app.Ctx): Promise<string> {
  return resolveGatewayBaseUrl(ctx, 'gc', await getStringSettingRaw(ctx, SETTING_KEYS.GC_BASE_URL))
}

/** Получить gc_test_school_api_key (без логирования значения). */
export async function getGcTestSchoolApiKey(ctx: app.Ctx): Promise<string> {
  return getStringSettingRaw(ctx, SETTING_KEYS.GC_TEST_SCHOOL_API_KEY)
}

/** Получить gc_test_school_host — хост тестовой школы без схемы. */
export async function getGcTestSchoolHost(ctx: app.Ctx): Promise<string> {
  return getStringSettingRaw(ctx, SETTING_KEYS.GC_TEST_SCHOOL_HOST)
}

/**
 * Получить gc_enabled — флаг включения GC-интеграции (safe-by-default:
 * `true` только при точном значении строки `'true'`).
 */
export async function getGcEnabled(ctx: app.Ctx): Promise<boolean> {
  const value = await getStringSettingRaw(ctx, SETTING_KEYS.GC_ENABLED)
  return value === 'true'
}

/**
 * Получить gc_create_payment — флаг передачи deal_is_paid='1' при createDeal.
 * Дефолт — включено (`DEFAULTS['gc_create_payment'] = 'true'`). Логика `!== 'false'`
 * намеренна: при любом значении, кроме точной строки `'false'`, функция возвращает `true`
 * (включая fallback-значение `'true'` из DEFAULTS при отсутствии записи в БД).
 */
export async function getGcCreatePayment(ctx: app.Ctx): Promise<boolean> {
  const value = await getStringSettingRaw(ctx, SETTING_KEYS.GC_CREATE_PAYMENT)
  return value !== 'false'
}

/**
 * Получить gc_deal_status — статус GC-сделки для downstream createDeal после
 * успешного webhook-платежа. Пустое/некорректное значение сохраняет старое
 * поведение: `payed` («Завершён»).
 */
export async function getGcDealStatus(ctx: app.Ctx): Promise<string> {
  const value = await getStringSettingRaw(ctx, SETTING_KEYS.GC_DEAL_STATUS)
  return value || (DEFAULTS[SETTING_KEYS.GC_DEAL_STATUS] as string)
}

/**
 * Сгенерировать случайный webhook-токен длиной ≥ 32 hex-символа.
 * Используется Math.random (платформа Chatium; crypto не везде доступен в Node-runtime).
 */
export function generateWebhookToken(byteCount: number = 32): string {
  const chars = 'abcdef0123456789'
  let result = ''
  // 2 hex-символа на байт
  const totalChars = Math.max(byteCount * 2, LP_WEBHOOK_TOKEN_MIN_LENGTH)
  for (let i = 0; i < totalChars; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/** Получить widget_lavatop_offer_id (id фиксированного оффера в deal-потоке). */
export async function getLavatopOfferId(ctx: app.Ctx): Promise<string> {
  return getStringSettingRaw(ctx, SETTING_KEYS.WIDGET_LAVATOP_OFFER_ID)
}

/** Получить widget_lavatop_product_id (id продукта в Lava.Top для updateOfferPrice). */
export async function getLavatopProductId(ctx: app.Ctx): Promise<string> {
  return getStringSettingRaw(ctx, SETTING_KEYS.WIDGET_LAVATOP_PRODUCT_ID)
}

/**
 * Получить ручной курс валюты (₽ за 1 единицу). Возвращает число > 0 или null
 * (если настройка пустая или невалидная — используется курс ЦБ).
 */
export async function getLavatopManualRate(
  ctx: app.Ctx,
  currency: 'USD' | 'EUR'
): Promise<number | null> {
  const key =
    currency === 'USD'
      ? SETTING_KEYS.WIDGET_LAVATOP_MANUAL_RATE_USD
      : SETTING_KEYS.WIDGET_LAVATOP_MANUAL_RATE_EUR
  const raw = await getStringSettingRaw(ctx, key)
  if (!raw) return null
  const parsed = parseFloat(raw)
  return isValidManualRate(parsed) ? parsed : null
}

/**
 * Проверяет, является ли курс валюты валидным (конечное число > 0).
 */
export function isValidManualRate(v: number): boolean {
  return Number.isFinite(v) && v > 0
}

// setSetting вынесен в settings.mutations.ts (декомпозиция под /check).
// Re-export сохраняет публичный API: `import { setSetting } from './settings.lib'`
// и `settingsLib.setSetting(...)` через `import * as settingsLib from './settings.lib'`.
export { setSetting } from './settings.mutations'
