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
  MAX_BOT_ACCESS_TOKEN: 'max_bot_access_token',
  MAX_WEBHOOK_SECRET: 'max_webhook_secret',
  CORE_BROKER_MODULE_TOKEN: 'core_broker_module_token',
  CORE_BROKER_PUBLISH_ENABLED: 'core_broker_publish_enabled',
  CORE_BROKER_MODULE_KEY: 'core_broker_module_key',
  MAX_RECEIVE_MODE: 'max_receive_mode',
  MAX_UPDATE_TYPES: 'max_update_types',
  MAX_POLLING_LIMIT: 'max_polling_limit',
  MAX_POLLING_TIMEOUT_SEC: 'max_polling_timeout_sec',
  MAX_POLLING_INTERVAL_SEC: 'max_polling_interval_sec',
  MAX_POLLING_MARKER: 'max_polling_marker',
  MAX_RAW_DEDUP_POLICY: 'max_raw_dedup_policy',
  MAX_CHAT_DISCOVERY_ENABLED: 'max_chat_discovery_enabled',
  MAX_HISTORY_REFRESH_ENABLED: 'max_history_refresh_enabled',
  MAX_HISTORY_BATCH_SIZE: 'max_history_batch_size',
  MAX_HISTORY_DELETE_BATCH_SIZE: 'max_history_delete_batch_size',
  MAX_HISTORY_JOB_BUDGET_MS: 'max_history_job_budget_ms',
  MAX_HISTORY_MAX_BATCHES_PER_JOB: 'max_history_max_batches_per_job',
  MAX_MINIAPPS_ENABLED: 'max_miniapps_enabled',
  MAX_MINIAPP_DEFAULT_PAGE: 'max_miniapp_default_page',
  MAX_MINIAPP_INIT_DATA_TTL_SEC: 'max_miniapp_init_data_ttl_sec'
} as const

export const SECRET_SETTING_KEYS = [
  SETTING_KEYS.MAX_BOT_ACCESS_TOKEN,
  SETTING_KEYS.MAX_WEBHOOK_SECRET,
  SETTING_KEYS.CORE_BROKER_MODULE_TOKEN
] as const

/** Настройка вебхука логов: enable — активна ли отправка, url — куда отправлять. */
export type LogWebhookSetting = { enable: boolean; url: string }

/** Значения по умолчанию */
export const DEFAULTS = {
  [SETTING_KEYS.PROJECT_NAME]: 'BPM Interfaces Max',
  [SETTING_KEYS.PROJECT_TITLE]: 'BPM Interfaces Max',
  [SETTING_KEYS.LOG_LEVEL]: 'Info',
  [SETTING_KEYS.LOGS_LIMIT]: '100',
  [SETTING_KEYS.LOG_WEBHOOK]: { enable: false, url: '' } as LogWebhookSetting,
  [SETTING_KEYS.DASHBOARD_RESET_AT]: null as number | null,
  [SETTING_KEYS.MAX_BOT_ACCESS_TOKEN]: '',
  [SETTING_KEYS.MAX_WEBHOOK_SECRET]: '',
  [SETTING_KEYS.CORE_BROKER_MODULE_TOKEN]: '',
  [SETTING_KEYS.CORE_BROKER_PUBLISH_ENABLED]: true,
  [SETTING_KEYS.CORE_BROKER_MODULE_KEY]: 'p/units/aley/bpm/interfaces/max',
  [SETTING_KEYS.MAX_RECEIVE_MODE]: 'webhook',
  [SETTING_KEYS.MAX_UPDATE_TYPES]: [] as string[],
  [SETTING_KEYS.MAX_POLLING_LIMIT]: 100,
  [SETTING_KEYS.MAX_POLLING_TIMEOUT_SEC]: 30,
  [SETTING_KEYS.MAX_POLLING_INTERVAL_SEC]: 5,
  [SETTING_KEYS.MAX_POLLING_MARKER]: null as number | null,
  [SETTING_KEYS.MAX_RAW_DEDUP_POLICY]: 'fingerprint',
  [SETTING_KEYS.MAX_CHAT_DISCOVERY_ENABLED]: true,
  [SETTING_KEYS.MAX_HISTORY_REFRESH_ENABLED]: true,
  [SETTING_KEYS.MAX_HISTORY_BATCH_SIZE]: 50,
  [SETTING_KEYS.MAX_HISTORY_DELETE_BATCH_SIZE]: 500,
  [SETTING_KEYS.MAX_HISTORY_JOB_BUDGET_MS]: 8000,
  [SETTING_KEYS.MAX_HISTORY_MAX_BATCHES_PER_JOB]: 3,
  [SETTING_KEYS.MAX_MINIAPPS_ENABLED]: true,
  [SETTING_KEYS.MAX_MINIAPP_DEFAULT_PAGE]: 'root',
  [SETTING_KEYS.MAX_MINIAPP_INIT_DATA_TTL_SEC]: 600
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

function parseBool(value: unknown, key: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${key} должен быть boolean true/false`)
  return value
}

function parseIntRange(value: unknown, key: string, min: number, max: number): number {
  const raw =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^-?\d+$/.test(value.trim())
        ? Number(value.trim())
        : NaN
  if (!Number.isInteger(raw) || raw < min || raw > max) {
    throw new Error(`${key} должен быть целым числом от ${min} до ${max}`)
  }
  return raw
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
  return typeof row?.value === 'string' ? row.value : ''
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
  for (const key of SECRET_SETTING_KEYS) result[key] = redactSettingValue(key, result[key])
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
    key === SETTING_KEYS.MAX_BOT_ACCESS_TOKEN ||
    key === SETTING_KEYS.MAX_WEBHOOK_SECRET ||
    key === SETTING_KEYS.CORE_BROKER_MODULE_TOKEN
  ) {
    normalized = typeof value === 'string' ? value.trim() : ''
  } else if (
    key === SETTING_KEYS.CORE_BROKER_PUBLISH_ENABLED ||
    key === SETTING_KEYS.MAX_CHAT_DISCOVERY_ENABLED ||
    key === SETTING_KEYS.MAX_HISTORY_REFRESH_ENABLED ||
    key === SETTING_KEYS.MAX_MINIAPPS_ENABLED
  ) {
    normalized = parseBool(value, key)
  } else if (key === SETTING_KEYS.CORE_BROKER_MODULE_KEY) {
    normalized = typeof value === 'string' && value.trim() ? value.trim() : DEFAULTS[key]
  } else if (key === SETTING_KEYS.MAX_RECEIVE_MODE) {
    const mode = typeof value === 'string' ? value.trim() : ''
    if (!['webhook', 'long_polling', 'disabled'].includes(mode))
      throw new Error('Invalid max_receive_mode')
    normalized = mode
  } else if (key === SETTING_KEYS.MAX_UPDATE_TYPES) {
    normalized = Array.isArray(value) ? Array.from(new Set(value.map(String).filter(Boolean))) : []
  } else if (key === SETTING_KEYS.MAX_POLLING_LIMIT) {
    normalized = parseIntRange(value, key, 1, 1000)
  } else if (key === SETTING_KEYS.MAX_POLLING_TIMEOUT_SEC) {
    normalized = parseIntRange(value, key, 0, 90)
  } else if (key === SETTING_KEYS.MAX_POLLING_INTERVAL_SEC) {
    normalized = parseIntRange(value, key, 1, 300)
  } else if (key === SETTING_KEYS.MAX_POLLING_MARKER) {
    normalized =
      value === null || value === '' ? null : parseIntRange(value, key, 0, Number.MAX_SAFE_INTEGER)
  } else if (key === SETTING_KEYS.MAX_RAW_DEDUP_POLICY) {
    const policy = typeof value === 'string' ? value.trim() : ''
    if (!['none', 'fingerprint'].includes(policy)) throw new Error('Invalid max_raw_dedup_policy')
    normalized = policy
  } else if (key === SETTING_KEYS.MAX_HISTORY_BATCH_SIZE) {
    normalized = parseIntRange(value, key, 1, 100)
  } else if (key === SETTING_KEYS.MAX_HISTORY_DELETE_BATCH_SIZE) {
    normalized = parseIntRange(value, key, 1, 1000)
  } else if (key === SETTING_KEYS.MAX_HISTORY_JOB_BUDGET_MS) {
    normalized = parseIntRange(value, key, 1000, 9000)
  } else if (key === SETTING_KEYS.MAX_HISTORY_MAX_BATCHES_PER_JOB) {
    normalized = parseIntRange(value, key, 1, 20)
  } else if (key === SETTING_KEYS.MAX_MINIAPP_DEFAULT_PAGE) {
    normalized = typeof value === 'string' ? value.trim() : ''
  } else if (key === SETTING_KEYS.MAX_MINIAPP_INIT_DATA_TTL_SEC) {
    normalized = parseIntRange(value, key, 60, 3600)
  }

  await repo.upsert(ctx, key, normalized)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting exit`,
    payload: { key, normalized: redactSettingValue(key, normalized) }
  })
}
