import * as repo from '../repos/settings.repo'
import * as loggerLib from './logger.lib'

const LOG_MODULE = 'lib/settings.lib'

export const SETTING_KEYS = {
  PROJECT_NAME: 'project_name',
  PROJECT_TITLE: 'project_title',
  LOG_LEVEL: 'log_level',
  LOGS_LIMIT: 'logs_limit',
  LOG_WEBHOOK: 'log_webhook',
  DASHBOARD_RESET_AT: 'dashboard_reset_at',
  GATEWAY_BASE_URL: 'gateway_base_url',
  GC_SCHOOL_HOST: 'gc_school_host',
  GC_SCHOOL_API_KEY: 'gc_school_api_key',
  WEBHOOK_PATH_TOKEN: 'webhook_path_token',
  GC_DEFAULT_OFFER_ID: 'gc_default_offer_id',
  GC_PAID_STATUS: 'gc_paid_status'
} as const

export const SECRET_SETTING_KEYS = ['gc_school_api_key', 'webhook_path_token'] as const

export type LogWebhookSetting = { enable: boolean; url: string }

export const DEFAULTS = {
  [SETTING_KEYS.PROJECT_NAME]: 'GetCourse Interface',
  [SETTING_KEYS.PROJECT_TITLE]: 'GetCourse Interface',
  [SETTING_KEYS.LOG_LEVEL]: 'Info',
  [SETTING_KEYS.LOGS_LIMIT]: '100',
  [SETTING_KEYS.LOG_WEBHOOK]: { enable: false, url: '' } as LogWebhookSetting,
  [SETTING_KEYS.DASHBOARD_RESET_AT]: null as number | null,
  [SETTING_KEYS.GC_PAID_STATUS]: 'payed'
} as const

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

export async function getLogLevel(ctx: app.Ctx): Promise<LogLevel> {
  const value = await getSetting(ctx, SETTING_KEYS.LOG_LEVEL)
  return isLogLevel(value) ? value : (DEFAULTS[SETTING_KEYS.LOG_LEVEL] as LogLevel)
}

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

export async function getLogWebhook(ctx: app.Ctx): Promise<LogWebhookSetting> {
  const value = await getSetting(ctx, SETTING_KEYS.LOG_WEBHOOK)
  return isLogWebhook(value) ? value : DEFAULTS[SETTING_KEYS.LOG_WEBHOOK]
}

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

// ---------------------------------------------------------------------------
// GetCourse-специфичные геттеры
// ---------------------------------------------------------------------------

export async function getGatewayBaseUrl(ctx: app.Ctx): Promise<string> {
  const value = await getSetting(ctx, SETTING_KEYS.GATEWAY_BASE_URL)
  return typeof value === 'string' ? value : ''
}

export async function getGcSchoolHost(ctx: app.Ctx): Promise<string> {
  const value = await getSetting(ctx, SETTING_KEYS.GC_SCHOOL_HOST)
  return typeof value === 'string' ? value : ''
}

export async function getGcDefaultOfferId(ctx: app.Ctx): Promise<string> {
  const value = await getSetting(ctx, SETTING_KEYS.GC_DEFAULT_OFFER_ID)
  return typeof value === 'string' ? value : ''
}

export async function getGcPaidStatus(ctx: app.Ctx): Promise<string> {
  const value = await getSetting(ctx, SETTING_KEYS.GC_PAID_STATUS)
  return typeof value === 'string' && value ? value : DEFAULTS[SETTING_KEYS.GC_PAID_STATUS]
}

export async function getGcSchoolApiKey(ctx: app.Ctx): Promise<string> {
  return getRawSecretSettingString(ctx, SETTING_KEYS.GC_SCHOOL_API_KEY)
}

export async function getWebhookPathToken(ctx: app.Ctx): Promise<string> {
  return getRawSecretSettingString(ctx, SETTING_KEYS.WEBHOOK_PATH_TOKEN)
}

export async function setSetting(ctx: app.Ctx, key: string, value: unknown): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting entry`,
    payload: { key, value: redactSettingValue(key, value) }
  })
  let normalized: unknown = value

  if (key === SETTING_KEYS.LOG_LEVEL) {
    const str = typeof value === 'string' ? value : String(value)
    if (!isLogLevel(str)) {
      throw new Error(
        `Недопустимый уровень логирования: ${str}. Допустимо: ${LOG_LEVELS.join(', ')}`
      )
    }
    normalized = str
  } else if (key === SETTING_KEYS.LOGS_LIMIT) {
    const n = parseLogsLimit(value)
    if (n < 1 || n > 10000) {
      throw new Error(`Лимит логов должен быть от 1 до 10000, получено: ${value}`)
    }
    normalized = String(n)
  } else if (key === SETTING_KEYS.PROJECT_NAME || key === SETTING_KEYS.PROJECT_TITLE) {
    normalized = typeof value === 'string' ? value.trim() : String(value)
  } else if (key === SETTING_KEYS.LOG_WEBHOOK) {
    if (typeof value !== 'object' || value === null) {
      throw new Error('log_webhook должен быть объектом { enable: boolean, url: string }')
    }
    const o = value as Record<string, unknown>
    normalized = {
      enable: typeof o.enable === 'boolean' ? o.enable : false,
      url: typeof o.url === 'string' ? o.url : ''
    }
  } else if (key === SETTING_KEYS.DASHBOARD_RESET_AT) {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('dashboard_reset_at должен быть неотрицательным числом (Unix ms)')
    }
    normalized = Math.floor(n)
  } else if (key === SETTING_KEYS.GATEWAY_BASE_URL) {
    const str = typeof value === 'string' ? value.trim() : String(value).trim()
    if (str && !/^https?:\/\//i.test(str)) {
      try {
        await loggerLib.writeServerLog(ctx, {
          severity: 3,
          message: `[${LOG_MODULE}] setSetting: некорректный gateway_base_url`,
          payload: { key }
        })
      } catch (_) {}
      throw new Error('gateway_base_url должен начинаться с http:// или https://')
    }
    normalized = str.replace(/\/+$/, '')
  } else if (key === SETTING_KEYS.GC_SCHOOL_HOST) {
    const str = typeof value === 'string' ? value.trim() : String(value).trim()
    // Отрезаем схему и путь
    const host = str.replace(/^https?:\/\//i, '').split('/')[0] ?? ''
    normalized = host.trim()
  } else if (key === SETTING_KEYS.GC_SCHOOL_API_KEY) {
    normalized = typeof value === 'string' ? value.trim() : String(value).trim()
  } else if (key === SETTING_KEYS.WEBHOOK_PATH_TOKEN) {
    const str = typeof value === 'string' ? value.trim() : String(value).trim()
    if (str && str.length < 8) {
      try {
        await loggerLib.writeServerLog(ctx, {
          severity: 3,
          message: `[${LOG_MODULE}] setSetting: webhook_path_token слишком короткий`,
          payload: { key, length: str.length }
        })
      } catch (_) {}
      throw new Error('webhook_path_token должен быть не короче 8 символов')
    }
    normalized = str
  } else if (key === SETTING_KEYS.GC_DEFAULT_OFFER_ID) {
    const str = typeof value === 'string' ? value.trim() : String(value).trim()
    if (str && !/^\d+$/.test(str)) {
      try {
        await loggerLib.writeServerLog(ctx, {
          severity: 3,
          message: `[${LOG_MODULE}] setSetting: некорректный gc_default_offer_id`,
          payload: { key }
        })
      } catch (_) {}
      throw new Error('gc_default_offer_id должен быть числом')
    }
    normalized = str
  } else if (key === SETTING_KEYS.GC_PAID_STATUS) {
    const str =
      typeof value === 'string' ? value.trim().toLowerCase() : String(value).trim().toLowerCase()
    normalized = str || DEFAULTS[SETTING_KEYS.GC_PAID_STATUS]
  }

  await repo.upsert(ctx, key, normalized)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting exit`,
    payload: { key, normalized: redactSettingValue(key, normalized) }
  })
}
