import * as repo from '../repos/settings.repo'

/** Ключи настроек */
export const SETTING_KEYS = {
  PROJECT_NAME: 'project_name',
  PROJECT_TITLE: 'project_title',
  LOG_LEVEL: 'log_level',
  LOGS_LIMIT: 'logs_limit',
  LOG_WEBHOOK: 'log_webhook',
  DASHBOARD_RESET_AT: 'dashboard_reset_at',
  TELEGRAM_TEST_BOT_TOKEN: 'telegram_test_bot_token'
} as const

/** Настройка вебхука логов: enable — активна ли отправка, url — куда отправлять. */
export type LogWebhookSetting = { enable: boolean; url: string }

/** Значения по умолчанию */
export const DEFAULTS = {
  [SETTING_KEYS.PROJECT_NAME]: 'Реферальная программа',
  [SETTING_KEYS.PROJECT_TITLE]: 'Рефералы',
  [SETTING_KEYS.LOG_LEVEL]: 'Info',
  [SETTING_KEYS.LOGS_LIMIT]: '100',
  [SETTING_KEYS.LOG_WEBHOOK]: { enable: false, url: '' } as LogWebhookSetting,
  [SETTING_KEYS.DASHBOARD_RESET_AT]: null as number | null,
  [SETTING_KEYS.TELEGRAM_TEST_BOT_TOKEN]: '123456:TEST:TOKEN'
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

/**
 * Получить настройку. При отсутствии в БД возвращает дефолт.
 */
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
  const value = await getSetting(ctx, key)
  return typeof value === 'string'
    ? value
    : String((DEFAULTS as Record<string, unknown>)[key] ?? '')
}

/**
 * Получить уровень логирования (валидированный).
 */
export async function getLogLevel(ctx: app.Ctx): Promise<LogLevel> {
  const value = await getSetting(ctx, SETTING_KEYS.LOG_LEVEL)
  return isLogLevel(value) ? value : (DEFAULTS[SETTING_KEYS.LOG_LEVEL] as LogLevel)
}

/**
 * Получить лимит логов (число).
 */
export async function getLogsLimit(ctx: app.Ctx): Promise<number> {
  const value = await getSetting(ctx, SETTING_KEYS.LOGS_LIMIT)
  return parseLogsLimit(value)
}

function isLogWebhook(value: unknown): value is LogWebhookSetting {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>
  return typeof o.enable === 'boolean' && typeof o.url === 'string'
}

/**
 * Получить настройку вебхука логов (enable, url). При отсутствии — дефолт { enable: false, url: '' }.
 */
export async function getLogWebhook(ctx: app.Ctx): Promise<LogWebhookSetting> {
  const value = await getSetting(ctx, SETTING_KEYS.LOG_WEBHOOK)
  return isLogWebhook(value) ? value : DEFAULTS[SETTING_KEYS.LOG_WEBHOOK]
}

/**
 * Получить таймштамп сброса дашборда (Unix ms). При отсутствии — 0 (учитываются все логи).
 */
export async function getDashboardResetAt(ctx: app.Ctx): Promise<number> {
  const value = await getSetting(ctx, SETTING_KEYS.DASHBOARD_RESET_AT)
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value)
  }
  return 0
}

/**
 * Получить все настройки в виде объекта ключ-значение (с дефолтами).
 */
export async function getAllSettings(ctx: app.Ctx): Promise<Record<string, unknown>> {
  const rows = await repo.findAll(ctx)
  const result = { ...DEFAULTS } as Record<string, unknown>
  for (const row of rows) {
    if (row.key && row.value !== undefined && row.value !== null) {
      result[row.key] = row.value
    }
  }
  return result
}

/**
 * Сохранить настройку. Валидирует значение для известных ключей.
 */
export async function setSetting(ctx: app.Ctx, key: string, value: unknown): Promise<void> {
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
  } else if (key === SETTING_KEYS.TELEGRAM_TEST_BOT_TOKEN) {
    normalized =
      typeof value === 'string'
        ? value.trim()
        : value === null || value === undefined
          ? ''
          : String(value)
  }

  await repo.upsert(ctx, key, normalized)
}
