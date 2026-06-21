import * as repo from '../repos/settings.repo'
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
  BROKER_ENABLED: 'broker_enabled',
  BROKER_MAX_BATCH_SIZE: 'broker_max_batch_size',
  BROKER_DEFAULT_ACK_TIMEOUT_MS: 'broker_default_ack_timeout_ms',
  BROKER_DEFAULT_RETRY_MAX_ATTEMPTS: 'broker_default_retry_max_attempts',
  BROKER_DEFAULT_RETRY_INITIAL_DELAY_MS: 'broker_default_retry_initial_delay_ms',
  BROKER_DEFAULT_RETRY_BACKOFF_MULTIPLIER: 'broker_default_retry_backoff_multiplier',
  BROKER_NOTIFICATION_ENABLED: 'broker_notification_enabled',
  BROKER_NOTIFICATION_TIMEOUT_MS: 'broker_notification_timeout_ms',
  BROKER_NOTIFICATION_MAX_ATTEMPTS: 'broker_notification_max_attempts',
  BROKER_NOTIFICATION_RETRY_DELAY_MS: 'broker_notification_retry_delay_ms',
  BROKER_NOTIFICATION_BATCH_WINDOW_MS: 'broker_notification_batch_window_ms'
} as const

export const SECRET_SETTING_KEYS = [] as const

/** Настройка вебхука логов: enable — активна ли отправка, url — куда отправлять. */
export type LogWebhookSetting = { enable: boolean; url: string }

/** Значения по умолчанию */
export const DEFAULTS = {
  [SETTING_KEYS.PROJECT_NAME]: 'NESO Meta',
  [SETTING_KEYS.PROJECT_TITLE]: 'NESO Meta',
  [SETTING_KEYS.LOG_LEVEL]: 'Info',
  [SETTING_KEYS.LOGS_LIMIT]: '100',
  [SETTING_KEYS.LOG_WEBHOOK]: { enable: false, url: '' } as LogWebhookSetting,
  [SETTING_KEYS.DASHBOARD_RESET_AT]: null as number | null,
  [SETTING_KEYS.BROKER_ENABLED]: true,
  [SETTING_KEYS.BROKER_MAX_BATCH_SIZE]: 100,
  [SETTING_KEYS.BROKER_DEFAULT_ACK_TIMEOUT_MS]: 300000,
  [SETTING_KEYS.BROKER_DEFAULT_RETRY_MAX_ATTEMPTS]: 5,
  [SETTING_KEYS.BROKER_DEFAULT_RETRY_INITIAL_DELAY_MS]: 60000,
  [SETTING_KEYS.BROKER_DEFAULT_RETRY_BACKOFF_MULTIPLIER]: 2,
  [SETTING_KEYS.BROKER_NOTIFICATION_ENABLED]: true,
  [SETTING_KEYS.BROKER_NOTIFICATION_TIMEOUT_MS]: 5000,
  [SETTING_KEYS.BROKER_NOTIFICATION_MAX_ATTEMPTS]: 3,
  [SETTING_KEYS.BROKER_NOTIFICATION_RETRY_DELAY_MS]: 60000,
  [SETTING_KEYS.BROKER_NOTIFICATION_BATCH_WINDOW_MS]: 1000
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

function isSecretSettingKey(key: string): boolean {
  return (SECRET_SETTING_KEYS as readonly string[]).includes(key)
}

export function redactSettingValue(key: string, value: unknown): unknown {
  return isSecretSettingKey(key)
    ? { configured: typeof value === 'string' ? value.trim().length > 0 : !!value }
    : value
}

function parseIntegerSetting(value: unknown, key: string, min: number, max: number): number {
  const raw =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== '' && /^-?\d+$/.test(value.trim())
        ? Number(value.trim())
        : NaN
  if (!Number.isInteger(raw) || raw < min || raw > max) {
    throw new Error(`${key} должен быть целым числом от ${min} до ${max}`)
  }
  return raw
}

function parseNumberSetting(value: unknown, key: string, min: number, max: number): number {
  const raw =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value.trim())
        : NaN
  if (!Number.isFinite(raw) || raw < min || raw > max) {
    throw new Error(`${key} должен быть числом от ${min} до ${max}`)
  }
  return raw
}

function parseBooleanSetting(value: unknown, key: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${key} должен быть boolean true/false`)
  }
  return value
}

/** getSetting не логирует через writeServerLog — вызывается из logger.lib (getLogLevel, getLogWebhook), рекурсия. */
export async function getSetting(ctx: app.Ctx, key: string): Promise<unknown> {
  const row = await repo.findByKey(ctx, key)
  if (row && row.value !== undefined && row.value !== null) {
    return row.value
  }
  return (DEFAULTS as Record<string, unknown>)[key] ?? null
}

export async function getRawSecretSettingString(ctx: app.Ctx, key: string): Promise<string> {
  if (!isSecretSettingKey(key)) throw new Error(`Ключ ${key} не является secret setting`)
  const row = await repo.findByKey(ctx, key)
  const value = row?.value
  return typeof value === 'string' ? value : ''
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
  for (const key of SECRET_SETTING_KEYS) {
    result[key] = redactSettingValue(key, result[key])
  }
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getAllSettings exit`,
    payload: { resultKeys: Object.keys(result) }
  })
  return result
}

/**
 * Сохранить настройку. Валидирует значение для известных ключей.
 */
export async function setSetting(ctx: app.Ctx, key: string, value: unknown): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting entry`,
    payload: { key, value: redactSettingValue(key, value) }
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
  } else if (
    key === SETTING_KEYS.BROKER_ENABLED ||
    key === SETTING_KEYS.BROKER_NOTIFICATION_ENABLED
  ) {
    normalized = parseBooleanSetting(value, key)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting broker boolean branch`,
      payload: { key, normalized }
    })
  } else if (key === SETTING_KEYS.BROKER_MAX_BATCH_SIZE) {
    normalized = parseIntegerSetting(value, key, 1, 500)
  } else if (key === SETTING_KEYS.BROKER_DEFAULT_ACK_TIMEOUT_MS) {
    normalized = parseIntegerSetting(value, key, 10000, 3600000)
  } else if (key === SETTING_KEYS.BROKER_DEFAULT_RETRY_MAX_ATTEMPTS) {
    normalized = parseIntegerSetting(value, key, 0, 100)
  } else if (key === SETTING_KEYS.BROKER_DEFAULT_RETRY_INITIAL_DELAY_MS) {
    normalized = parseIntegerSetting(value, key, 0, 86400000)
  } else if (key === SETTING_KEYS.BROKER_DEFAULT_RETRY_BACKOFF_MULTIPLIER) {
    normalized = parseNumberSetting(value, key, 1, 10)
  } else if (key === SETTING_KEYS.BROKER_NOTIFICATION_TIMEOUT_MS) {
    normalized = parseIntegerSetting(value, key, 1000, 30000)
  } else if (key === SETTING_KEYS.BROKER_NOTIFICATION_MAX_ATTEMPTS) {
    normalized = parseIntegerSetting(value, key, 0, 20)
  } else if (key === SETTING_KEYS.BROKER_NOTIFICATION_RETRY_DELAY_MS) {
    normalized = parseIntegerSetting(value, key, 0, 86400000)
  } else if (key === SETTING_KEYS.BROKER_NOTIFICATION_BATCH_WINDOW_MS) {
    normalized = parseIntegerSetting(value, key, 0, 60000)
  }

  await repo.upsert(ctx, key, normalized)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting exit`,
    payload: { key, normalized: redactSettingValue(key, normalized) }
  })
}
