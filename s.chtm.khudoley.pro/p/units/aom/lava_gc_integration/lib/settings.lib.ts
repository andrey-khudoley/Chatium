import * as repo from '../repos/settings.repo'
import { normalizeLavaBaseUrlInput } from '../shared/lavaBaseUrl'
import { GC_SETTING_KEYS } from '../shared/gcSettingKeys'
import { LAVA_SETTING_KEYS } from '../shared/lavaSettingKeys'
import * as loggerLib from './logger.lib'

const LOG_MODULE = 'lib/settings.lib'

/** Ключи настроек */
export const SETTING_KEYS = {
  PROJECT_NAME: 'project_name',
  PROJECT_TITLE: 'project_title',
  LOG_LEVEL: 'log_level',
  LOGS_LIMIT: 'logs_limit',
  LOG_WEBHOOK: 'log_webhook',
  DASHBOARD_RESET_AT: 'dashboard_reset_at',
  ...LAVA_SETTING_KEYS,
  ...GC_SETTING_KEYS
} as const

/** Настройка вебхука логов: enable — активна ли отправка, url — куда отправлять. */
export type LogWebhookSetting = { enable: boolean; url: string }

/** Значения по умолчанию */
export const DEFAULTS = {
  [SETTING_KEYS.PROJECT_NAME]: 'Интеграция Lava.top и GC',
  [SETTING_KEYS.PROJECT_TITLE]: 'Lava + GC',
  [SETTING_KEYS.LOG_LEVEL]: 'Info',
  [SETTING_KEYS.LOGS_LIMIT]: '100',
  [SETTING_KEYS.LOG_WEBHOOK]: { enable: false, url: '' } as LogWebhookSetting,
  [SETTING_KEYS.DASHBOARD_RESET_AT]: null as number | null,
  [SETTING_KEYS.LAVA_API_KEY]: '',
  [SETTING_KEYS.LAVA_BASE_URL]: 'https://gate.lava.top',
  [SETTING_KEYS.LAVA_PRODUCT_ID]: '',
  [SETTING_KEYS.LAVA_OFFER_ID]: '',
  [SETTING_KEYS.LAVA_WEBHOOK_SECRET]: '',
  [SETTING_KEYS.GC_API_KEY]: '',
  [SETTING_KEYS.GC_DEV_KEY]: '',
  [SETTING_KEYS.GC_ACCOUNT_DOMAIN]: '',
  [SETTING_KEYS.GC_ORDER_FLAG_ADDFIELD_ID]: ''
} as const

/** Допустимые уровни логирования */
export const LOG_LEVELS = ['Debug', 'Info', 'Warn', 'Error', 'Disable'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && LOG_LEVELS.includes(value as LogLevel)
}

function parseLogsLimit(value: unknown): number {
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

/**
 * Получить настройку как строку.
 */
export async function getSettingString(ctx: app.Ctx, key: string): Promise<string> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] getSettingString entry`,
    payload: { key }
  })
  const value = await getSetting(ctx, key)
  const result =
    typeof value === 'string' ? value : String((DEFAULTS as Record<string, unknown>)[key] ?? '')
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
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
    severity: 7,
    message: `[${LOG_MODULE}] getLogsLimit entry`,
    payload: {}
  })
  const value = await getSetting(ctx, SETTING_KEYS.LOGS_LIMIT)
  const result = parseLogsLimit(value)
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
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
 * Строковая настройка интеграции без writeServerLog (как getLogLevel / getLogWebhook) —
 * иначе возможна рекурсия при вызовах из цепочек логирования.
 */
async function getIntegrationStringSetting(ctx: app.Ctx, key: string): Promise<string> {
  const value = await getSetting(ctx, key)
  if (typeof value === 'string') return value
  const fallback = (DEFAULTS as Record<string, unknown>)[key]
  return fallback !== undefined && fallback !== null ? String(fallback) : ''
}

/** Без writeServerLog — см. getIntegrationStringSetting. */
export async function getLavaApiKey(ctx: app.Ctx): Promise<string> {
  return getIntegrationStringSetting(ctx, SETTING_KEYS.LAVA_API_KEY)
}

/** Без writeServerLog — см. getIntegrationStringSetting. */
export async function getLavaBaseUrl(ctx: app.Ctx): Promise<string> {
  return getIntegrationStringSetting(ctx, SETTING_KEYS.LAVA_BASE_URL)
}

/** Без writeServerLog — см. getIntegrationStringSetting. */
export async function getLavaProductId(ctx: app.Ctx): Promise<string> {
  return getIntegrationStringSetting(ctx, SETTING_KEYS.LAVA_PRODUCT_ID)
}

/** Без writeServerLog — см. getIntegrationStringSetting. */
export async function getLavaOfferId(ctx: app.Ctx): Promise<string> {
  return getIntegrationStringSetting(ctx, SETTING_KEYS.LAVA_OFFER_ID)
}

/** Без writeServerLog — см. getIntegrationStringSetting. */
export async function getLavaWebhookSecret(ctx: app.Ctx): Promise<string> {
  return getIntegrationStringSetting(ctx, SETTING_KEYS.LAVA_WEBHOOK_SECRET)
}

/** Без writeServerLog — см. getIntegrationStringSetting. */
export async function getGcApiKey(ctx: app.Ctx): Promise<string> {
  return getIntegrationStringSetting(ctx, SETTING_KEYS.GC_API_KEY)
}

/** Без writeServerLog — см. getIntegrationStringSetting. */
export async function getGcDevKey(ctx: app.Ctx): Promise<string> {
  return getIntegrationStringSetting(ctx, SETTING_KEYS.GC_DEV_KEY)
}

/** Без writeServerLog — см. getIntegrationStringSetting. */
export async function getGcAccountDomain(ctx: app.Ctx): Promise<string> {
  return getIntegrationStringSetting(ctx, SETTING_KEYS.GC_ACCOUNT_DOMAIN)
}

/** Без writeServerLog — см. getIntegrationStringSetting. */
export async function getGcOrderFlagAddfieldId(ctx: app.Ctx): Promise<string> {
  return getIntegrationStringSetting(ctx, SETTING_KEYS.GC_ORDER_FLAG_ADDFIELD_ID)
}

/**
 * Получить таймштамп сброса дашборда (Unix ms). При отсутствии — 0 (учитываются все логи).
 */
export async function getDashboardResetAt(ctx: app.Ctx): Promise<number> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] getDashboardResetAt entry`,
    payload: {}
  })
  const value = await getSetting(ctx, SETTING_KEYS.DASHBOARD_RESET_AT)
  const result =
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] getDashboardResetAt exit`,
    payload: { value, result }
  })
  return result
}

/**
 * Получить все настройки в виде объекта ключ-значение (с дефолтами).
 */
export async function getAllSettings(ctx: app.Ctx): Promise<Record<string, unknown>> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] getAllSettings entry`,
    payload: {}
  })
  const rows = await repo.findAll(ctx)
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
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
    severity: 7,
    message: `[${LOG_MODULE}] getAllSettings exit`,
    payload: { resultKeys: Object.keys(result) }
  })
  return result
}

/**
 * Сохранить настройку. Валидирует значение для известных ключей.
 */
function isSecretSettingKey(key: string): boolean {
  return (
    key === SETTING_KEYS.LAVA_API_KEY ||
    key === SETTING_KEYS.LAVA_WEBHOOK_SECRET ||
    key === SETTING_KEYS.GC_API_KEY ||
    key === SETTING_KEYS.GC_DEV_KEY
  )
}

export async function setSetting(ctx: app.Ctx, key: string, value: unknown): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] setSetting entry`,
    payload: { key, value: isSecretSettingKey(key) ? '[redacted]' : value }
  })
  let normalized: unknown = value

  if (key === SETTING_KEYS.LOG_LEVEL) {
    const str = typeof value === 'string' ? value : String(value)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
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
      severity: 7,
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
      severity: 7,
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
      severity: 7,
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
      severity: 7,
      message: `[${LOG_MODULE}] setSetting DASHBOARD_RESET_AT branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.LAVA_BASE_URL) {
    normalized = normalizeLavaBaseUrlInput(typeof value === 'string' ? value : String(value))
  } else if (
    key === SETTING_KEYS.LAVA_API_KEY ||
    key === SETTING_KEYS.LAVA_PRODUCT_ID ||
    key === SETTING_KEYS.LAVA_OFFER_ID ||
    key === SETTING_KEYS.LAVA_WEBHOOK_SECRET ||
    key === SETTING_KEYS.GC_API_KEY ||
    key === SETTING_KEYS.GC_DEV_KEY ||
    key === SETTING_KEYS.GC_ACCOUNT_DOMAIN ||
    key === SETTING_KEYS.GC_ORDER_FLAG_ADDFIELD_ID
  ) {
    normalized = typeof value === 'string' ? value.trim() : String(value).trim()
  }

  await repo.upsert(ctx, key, normalized)
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] setSetting exit`,
    payload: { key, normalized: isSecretSettingKey(key) ? '[redacted]' : normalized }
  })
}
