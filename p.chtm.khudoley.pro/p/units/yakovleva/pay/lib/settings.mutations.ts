import * as repo from '../repos/settings.repo'
import * as loggerLib from './logger.lib'
import {
  SETTING_KEYS,
  LOG_LEVELS,
  LP_WEBHOOK_TOKEN_MIN_LENGTH,
  LAVA_WEBHOOK_SECRET_MIN_LENGTH,
  isLogLevel,
  parseLogsLimit,
  isValidLpLogin,
  normalizeLifepayGatewayBaseUrl,
  normalizeGcGatewayBaseUrl,
  isValidGatewayBaseUrl,
  normalizeLavaBaseUrl,
  isValidLavaBaseUrl,
  isValidGcSchoolHost,
  isValidDateFilter,
  normalizeDateFilter
} from './settings.lib'
import { WIDGET_INTENT_HARD_LIMIT_RUB } from '../shared/widgetSettingsTypes'
import { parsePaymentPageGeneral, isValidHexColor } from '../shared/paymentPageTypes'

const LOG_MODULE = 'lib/settings.mutations'

function maskSettingValueForLog(key: string, value: unknown): unknown {
  if (
    key === SETTING_KEYS.LP_APIKEY ||
    key === SETTING_KEYS.LP_WEBHOOK_TOKEN ||
    key === SETTING_KEYS.LAVA_TEST_APIKEY ||
    key === SETTING_KEYS.LAVA_WEBHOOK_SECRET ||
    key === SETTING_KEYS.GC_TEST_SCHOOL_API_KEY
  ) {
    return typeof value === 'string' && value.length > 0 ? '***' : value
  }
  if (key === SETTING_KEYS.LP_LOGIN && typeof value === 'string' && value.length === 11) {
    return `+${value.slice(0, 4)}***${value.slice(-4)}`
  }
  return value
}

/**
 * Сохранить настройку. Валидирует значение для известных ключей.
 *
 * Вынесено из settings.lib.ts (декомпозиция под /check). Публичный API
 * сохранён через re-export `setSetting` из settings.lib.ts.
 */
export async function setSetting(ctx: app.Ctx, key: string, value: unknown): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting entry`,
    payload: { key, value: maskSettingValueForLog(key, value) }
  })
  let normalized: unknown = value

  if (key === SETTING_KEYS.LOG_LEVEL) {
    const str = typeof value === 'string' ? value : String(value)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LOG_LEVEL branch`,
      payload: { str, isLogLevel: isLogLevel(str) }
    })
    if (!isLogLevel(str)) {
      throw new Error(
        `Недопустимый уровень логирования: ${str}. Допустимо: ${LOG_LEVELS.join(', ')}`
      )
    }
    normalized = str
  } else if (key === SETTING_KEYS.LOGS_LIMIT) {
    const n = parseLogsLimit(value)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LOGS_LIMIT branch`,
      payload: { n, value }
    })
    if (n < 1 || n > 10000) {
      throw new Error(`Лимит логов должен быть от 1 до 10000, получено: ${value}`)
    }
    normalized = String(n)
  } else if (key === SETTING_KEYS.PROJECT_NAME || key === SETTING_KEYS.PROJECT_TITLE) {
    normalized = typeof value === 'string' ? value.trim() : String(value)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting PROJECT_NAME/PROJECT_TITLE branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.LOG_WEBHOOK) {
    if (typeof value !== 'object' || value === null) {
      throw new Error('log_webhook должен быть объектом { enable: boolean, url: string }')
    }
    const o = value as Record<string, unknown>
    normalized = {
      enable: typeof o.enable === 'boolean' ? o.enable : false,
      url: typeof o.url === 'string' ? o.url : ''
    }
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LOG_WEBHOOK branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.DASHBOARD_RESET_AT) {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('dashboard_reset_at должен быть неотрицательным числом (Unix ms)')
    }
    normalized = Math.floor(n)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting DASHBOARD_RESET_AT branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.LP_APIKEY) {
    const str = typeof value === 'string' ? value.trim() : ''
    if (!str) {
      throw new Error('lp_apikey не может быть пустым')
    }
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LP_APIKEY branch (length only, value redacted)`,
      payload: { keyLength: str.length }
    })
  } else if (key === SETTING_KEYS.LP_LOGIN) {
    const str = typeof value === 'string' ? value.trim() : ''
    if (!isValidLpLogin(str)) {
      throw new Error(
        'lp_login должен быть номером телефона в формате 7XXXXXXXXXX (11 цифр, начинается с 7).'
      )
    }
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LP_LOGIN branch (masked)`,
      payload: { loginMask: `+${str.slice(0, 4)}***${str.slice(-4)}` }
    })
  } else if (key === SETTING_KEYS.LP_WEBHOOK_TOKEN) {
    const str = typeof value === 'string' ? value.trim() : ''
    if (str.length < LP_WEBHOOK_TOKEN_MIN_LENGTH) {
      throw new Error(
        `lp_webhook_token должен содержать не менее ${LP_WEBHOOK_TOKEN_MIN_LENGTH} символов`
      )
    }
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LP_WEBHOOK_TOKEN branch (length only, value redacted)`,
      payload: { tokenLength: str.length }
    })
  } else if (key === SETTING_KEYS.GATEWAY_BASE_URL) {
    const trimmed = typeof value === 'string' ? value.trim() : ''
    const normalizedUrl = normalizeLifepayGatewayBaseUrl(trimmed)
    if (normalizedUrl && !isValidGatewayBaseUrl(normalizedUrl)) {
      throw new Error(
        'gateway_base_url должен быть пустым (auto) или начинаться с http:// или https://'
      )
    }
    normalized = normalizedUrl
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GATEWAY_BASE_URL branch`,
      payload: { normalized: normalizedUrl }
    })
  } else if (key === SETTING_KEYS.LAVA_TEST_APIKEY) {
    const str = typeof value === 'string' ? value.trim() : ''
    if (!str) {
      throw new Error('lava_test_apikey не может быть пустым')
    }
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LAVA_TEST_APIKEY branch (length only, value redacted)`,
      payload: { keyLength: str.length }
    })
  } else if (key === SETTING_KEYS.LAVA_BASE_URL) {
    const trimmed = typeof value === 'string' ? value.trim() : ''
    // Пустой ввод сохраняем как auto-mode: runtime подставит gateway текущего workspace.
    const normalizedUrl = normalizeLavaBaseUrl(trimmed)
    if (normalizedUrl && !isValidLavaBaseUrl(normalizedUrl)) {
      throw new Error(
        'lava_base_url должен быть пустым (auto) или начинаться с http:// или https://'
      )
    }
    normalized = normalizedUrl
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LAVA_BASE_URL branch`,
      payload: { normalized: normalizedUrl }
    })
  } else if (key === SETTING_KEYS.LAVA_WEBHOOK_SECRET) {
    const str = typeof value === 'string' ? value.trim() : ''
    if (str.length < LAVA_WEBHOOK_SECRET_MIN_LENGTH) {
      throw new Error(
        `lava_webhook_secret должен содержать не менее ${LAVA_WEBHOOK_SECRET_MIN_LENGTH} символов`
      )
    }
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LAVA_WEBHOOK_SECRET branch (length only, value redacted)`,
      payload: { secretLength: str.length }
    })
  } else if (key === SETTING_KEYS.GC_BASE_URL) {
    const trimmed = typeof value === 'string' ? value.trim() : ''
    const normalizedUrl = normalizeGcGatewayBaseUrl(trimmed)
    if (normalizedUrl && !isValidGatewayBaseUrl(normalizedUrl)) {
      throw new Error('gc_base_url должен быть пустым (auto) или начинаться с http:// или https://')
    }
    normalized = normalizedUrl
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GC_BASE_URL branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.GC_TEST_SCHOOL_API_KEY) {
    const str = typeof value === 'string' ? value.trim() : ''
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GC_TEST_SCHOOL_API_KEY branch (length only, value redacted)`,
      payload: { keyLength: str.length }
    })
  } else if (key === SETTING_KEYS.GC_TEST_SCHOOL_HOST) {
    const str = typeof value === 'string' ? value.trim() : ''
    if (str && !isValidGcSchoolHost(str)) {
      throw new Error(
        'gc_test_school_host должен быть hostname без схемы (например, school.getcourse.ru).'
      )
    }
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GC_TEST_SCHOOL_HOST branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.GC_ENABLED) {
    const str =
      typeof value === 'string' ? value.trim() : typeof value === 'boolean' ? String(value) : ''
    if (str !== 'true' && str !== 'false') {
      throw new Error('gc_enabled должен быть строкой "true" или "false".')
    }
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GC_ENABLED branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.GC_CREATE_PAYMENT) {
    const str =
      typeof value === 'string' ? value.trim() : typeof value === 'boolean' ? String(value) : ''
    if (str !== 'true' && str !== 'false') {
      throw new Error('gc_create_payment должен быть строкой "true" или "false".')
    }
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GC_CREATE_PAYMENT branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.PANEL_DATE_FILTER) {
    if (!isValidDateFilter(value)) {
      throw new Error(
        'panel_date_filter должен быть объектом { from?: number > 0, to?: number > 0 }, при обеих границах from <= to'
      )
    }
    normalized = normalizeDateFilter(value)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting PANEL_DATE_FILTER branch`,
      payload: { normalized }
    })
  } else if (
    key === SETTING_KEYS.WIDGET_LIFEPAY_ENABLED ||
    key === SETTING_KEYS.WIDGET_LAVATOP_ENABLED
  ) {
    const str =
      typeof value === 'string' ? value.trim() : typeof value === 'boolean' ? String(value) : ''
    if (str !== 'true' && str !== 'false') {
      throw new Error(`${key} должен быть строкой "true" или "false".`)
    }
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting WIDGET_*_ENABLED branch`,
      payload: { key, normalized }
    })
  } else if (
    key === SETTING_KEYS.WIDGET_LIFEPAY_MIN ||
    key === SETTING_KEYS.WIDGET_LAVATOP_MIN ||
    key === SETTING_KEYS.WIDGET_LIFEPAY_MAX ||
    key === SETTING_KEYS.WIDGET_LAVATOP_MAX
  ) {
    const n =
      typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value, 10) : NaN
    if (!Number.isFinite(n) || n < 0) {
      throw new Error(`${key} должен быть неотрицательным числом (0 = без ограничений).`)
    }
    if (n > WIDGET_INTENT_HARD_LIMIT_RUB) {
      throw new Error(
        `${key} не может превышать серверный hard-limit ${WIDGET_INTENT_HARD_LIMIT_RUB} ₽.`
      )
    }
    normalized = String(Math.floor(n))
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting WIDGET_*_MIN/MAX branch`,
      payload: { key, normalized }
    })
  } else if (
    key === SETTING_KEYS.WIDGET_LIFEPAY_OFFER_LIST_TYPE ||
    key === SETTING_KEYS.WIDGET_LAVATOP_OFFER_LIST_TYPE
  ) {
    const str = typeof value === 'string' ? value.trim() : ''
    if (str !== 'off' && str !== 'whitelist' && str !== 'blacklist') {
      throw new Error(`${key} допустимо только "off", "whitelist" или "blacklist".`)
    }
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting WIDGET_*_OFFER_LIST_TYPE branch`,
      payload: { key, normalized }
    })
  } else if (
    key === SETTING_KEYS.WIDGET_LIFEPAY_OFFER_IDS ||
    key === SETTING_KEYS.WIDGET_LAVATOP_OFFER_IDS
  ) {
    const str = typeof value === 'string' ? value.trim() : ''
    if (str.length === 0) {
      normalized = '[]'
    } else {
      let parsed: unknown
      try {
        parsed = JSON.parse(str)
      } catch {
        throw new Error(`${key} должен быть валидной JSON-строкой массива строк.`)
      }
      if (!Array.isArray(parsed)) {
        throw new Error(`${key} должен быть JSON-массивом строк.`)
      }
      const cleaned: string[] = []
      for (const item of parsed) {
        if (typeof item !== 'string' || item.trim().length === 0) {
          throw new Error(`${key}: каждый элемент должен быть непустой строкой.`)
        }
        cleaned.push(item.trim())
      }
      normalized = JSON.stringify(cleaned)
    }
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting WIDGET_*_OFFER_IDS branch`,
      payload: { key, normalizedLength: (normalized as string).length }
    })
  } else if (
    key === SETTING_KEYS.WIDGET_LIFEPAY_OFFERS ||
    key === SETTING_KEYS.WIDGET_LAVATOP_OFFERS
  ) {
    const str = typeof value === 'string' ? value.trim() : ''
    if (str.length === 0) {
      normalized = '[]'
    } else {
      let parsed: unknown
      try {
        parsed = JSON.parse(str)
      } catch {
        throw new Error(`${key} должен быть валидной JSON-строкой массива офферов.`)
      }
      if (!Array.isArray(parsed)) {
        throw new Error(`${key} должен быть JSON-массивом объектов {id, title} или строк.`)
      }
      type CleanedOffer = { id: string; title: string }
      const cleaned: CleanedOffer[] = []
      for (const item of parsed) {
        if (typeof item === 'string') {
          // legacy: строка → id
          const id = item.trim()
          if (!id) throw new Error(`${key}: строковый элемент не может быть пустым.`)
          cleaned.push({ id, title: '' })
        } else if (typeof item === 'object' && item !== null) {
          const o = item as Record<string, unknown>
          const id = String(o.id ?? '').trim()
          if (!id) throw new Error(`${key}: поле id обязательно и не может быть пустым.`)
          const title = typeof o.title === 'string' ? o.title.trim() : ''
          cleaned.push({ id, title })
        } else {
          throw new Error(`${key}: каждый элемент должен быть строкой или объектом {id, title}.`)
        }
      }
      normalized = JSON.stringify(cleaned)
    }
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting WIDGET_*_OFFERS branch`,
      payload: { key, normalizedLength: (normalized as string).length }
    })
  } else if (
    key === SETTING_KEYS.WIDGET_LAVATOP_OFFER_ID ||
    key === SETTING_KEYS.WIDGET_LAVATOP_PRODUCT_ID
  ) {
    normalized = typeof value === 'string' ? value.trim() : ''
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting WIDGET_LAVATOP_PRODUCT/OFFER branch`,
      payload: { key, hasValue: Boolean(normalized) }
    })
  } else if (key === SETTING_KEYS.PAYMENT_PAGE_GENERAL) {
    const parsed = parsePaymentPageGeneral(value)
    if (!isValidHexColor(parsed.accentColor)) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_MODULE}] setSetting PAYMENT_PAGE_GENERAL invalid accentColor`,
        payload: { accentColor: parsed.accentColor }
      })
      throw new Error('payment_page_general: accentColor должен быть валидным hex (#rrggbb).')
    }
    normalized = parsed
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting PAYMENT_PAGE_GENERAL branch`,
      payload: {
        enabled: parsed.enabled,
        accentColor: parsed.accentColor,
        calloutHtmlLength: parsed.calloutHtml.length
      }
    })
    // @deprecated PAYMENT_PAGE_METHODS: данные методов теперь хранятся в таблице PaymentPageMethods.
    // setSetting по этому ключу больше не вызывается; ветка оставлена для безопасного no-op
    // при случайном вызове (не должно происходить в рабочем коде).
  } else if (key === SETTING_KEYS.PAYMENT_PAGE_METHODS) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] setSetting PAYMENT_PAGE_METHODS deprecated — methods stored in Heap table, not settings`,
      payload: {}
    })
    // Не сохраняем — методы хранятся в таблице PaymentPageMethods
    return
  }

  await repo.upsert(ctx, key, normalized)
  // Маскировка значений-секретов в exit-логе:
  let exitNormalized: unknown
  if (
    key === SETTING_KEYS.LP_APIKEY ||
    key === SETTING_KEYS.LP_WEBHOOK_TOKEN ||
    key === SETTING_KEYS.LAVA_TEST_APIKEY ||
    key === SETTING_KEYS.LAVA_WEBHOOK_SECRET ||
    key === SETTING_KEYS.GC_TEST_SCHOOL_API_KEY
  ) {
    exitNormalized = '***'
  } else if (
    key === SETTING_KEYS.LP_LOGIN &&
    typeof normalized === 'string' &&
    normalized.length === 11
  ) {
    exitNormalized = `+${normalized.slice(0, 4)}***${normalized.slice(-4)}`
  } else if (
    key === SETTING_KEYS.PAYMENT_PAGE_GENERAL &&
    normalized !== null &&
    typeof normalized === 'object' &&
    !Array.isArray(normalized)
  ) {
    const n = normalized as Record<string, unknown>
    exitNormalized = {
      ...n,
      calloutHtml: '<' + ((n.calloutHtml as string | undefined)?.length ?? 0) + ' chars>'
    }
  } else {
    exitNormalized = normalized
  }
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting exit`,
    payload: { key, normalized: exitNormalized }
  })
}
