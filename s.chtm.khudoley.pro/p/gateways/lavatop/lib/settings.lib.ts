import * as repo from '../repos/settings.repo'
import * as loggerLib from './logger.lib'
import {
  LAVA_TEST_APIKEY,
  LAVA_BASE_URL_KEY,
  LAVA_WEBHOOK_SECRET_KEY,
  PANEL_DATE_FILTER_KEY,
  LAVA_DEFAULT_BASE_URL,
  normalizeLavaBaseUrlInput
} from '../shared/gatewaySettingKeys'

const LOG_MODULE = 'lib/settings.lib'

/** Ключи настроек */
export const SETTING_KEYS = {
  PROJECT_NAME: 'project_name',
  PROJECT_TITLE: 'project_title',
  LOG_LEVEL: 'log_level',
  LOGS_LIMIT: 'logs_limit',
  LOG_WEBHOOK: 'log_webhook',
  DASHBOARD_RESET_AT: 'dashboard_reset_at',
  // Lava.Top gateway
  LAVA_TEST_APIKEY,
  LAVA_BASE_URL: LAVA_BASE_URL_KEY,
  LAVA_WEBHOOK_SECRET: LAVA_WEBHOOK_SECRET_KEY,
  PANEL_DATE_FILTER: PANEL_DATE_FILTER_KEY
} as const

/** Фильтр по дате панели оператора (Unix ms); null-границы = без ограничения. */
export type PanelDateFilter = { from: number | null; to: number | null }

/** Настройка вебхука логов: enable — активна ли отправка, url — куда отправлять. */
export type LogWebhookSetting = { enable: boolean; url: string }

/** Значения по умолчанию */
export const DEFAULTS = {
  [SETTING_KEYS.PROJECT_NAME]: 'Lava.Top Gateway',
  [SETTING_KEYS.PROJECT_TITLE]: 'Lava.Top',
  [SETTING_KEYS.LOG_LEVEL]: 'Info',
  [SETTING_KEYS.LOGS_LIMIT]: '100',
  [SETTING_KEYS.LOG_WEBHOOK]: { enable: false, url: '' } as LogWebhookSetting,
  [SETTING_KEYS.DASHBOARD_RESET_AT]: null as number | null,
  [SETTING_KEYS.LAVA_TEST_APIKEY]: '',
  [SETTING_KEYS.LAVA_BASE_URL]: LAVA_DEFAULT_BASE_URL,
  [SETTING_KEYS.LAVA_WEBHOOK_SECRET]: '',
  [SETTING_KEYS.PANEL_DATE_FILTER]: null as PanelDateFilter | null
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
    payload: { key, value }
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
  }

  await repo.upsert(ctx, key, normalized)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting exit`,
    payload: { key, normalized }
  })
}

// --- Lava.Top gateway settings (тихие геттеры: вызываются на каждый v1-запрос, без trace-логов) ---

/**
 * Тестовый API-ключ Lava.Top из настроек (`lava_test_apikey`). Используется формой «Создать
 * запрос» в панели и интеграционным тестом `verifyLavaCredentials`. Боевые вызовы `/v1/{op}`
 * берут ключ из заголовка `X-Lava-Apikey`, а не отсюда. Пустая строка = не задан.
 */
export async function getLavaTestApiKey(ctx: app.Ctx): Promise<string> {
  const value = await getSetting(ctx, SETTING_KEYS.LAVA_TEST_APIKEY)
  return typeof value === 'string' ? value : ''
}

/**
 * Базовый URL Lava.Top из настроек (`lava_base_url`), нормализованный.
 * По умолчанию — `https://gate.lava.top`.
 */
export async function getLavaBaseUrl(ctx: app.Ctx): Promise<string> {
  const value = await getSetting(ctx, SETTING_KEYS.LAVA_BASE_URL)
  return normalizeLavaBaseUrlInput(typeof value === 'string' ? value : '')
}

/**
 * Секрет приёма вебхуков Lava.Top (`lava_webhook_secret`). Пустая строка = не задан
 * (эндпоинт вебхука вернёт 500 «конфигурация неполная», не 401).
 */
export async function getLavaWebhookSecret(ctx: app.Ctx): Promise<string> {
  const value = await getSetting(ctx, SETTING_KEYS.LAVA_WEBHOOK_SECRET)
  return typeof value === 'string' ? value : ''
}

function isPanelDateFilter(value: unknown): value is PanelDateFilter {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>
  const okFrom = o.from === null || (typeof o.from === 'number' && Number.isFinite(o.from))
  const okTo = o.to === null || (typeof o.to === 'number' && Number.isFinite(o.to))
  return okFrom && okTo
}

/**
 * Фильтр по дате панели (`panel_date_filter`). При отсутствии/невалидности — `{ from: null, to: null }`
 * («за всё время»).
 */
export async function getPanelDateFilter(ctx: app.Ctx): Promise<PanelDateFilter> {
  const value = await getSetting(ctx, SETTING_KEYS.PANEL_DATE_FILTER)
  return isPanelDateFilter(value) ? value : { from: null, to: null }
}

/** Сохранить фильтр по дате панели. `null` границы = снять ограничение. */
export async function setPanelDateFilter(
  ctx: app.Ctx,
  from: number | null,
  to: number | null
): Promise<void> {
  const normalized: PanelDateFilter = {
    from: typeof from === 'number' && Number.isFinite(from) && from >= 0 ? Math.floor(from) : null,
    to: typeof to === 'number' && Number.isFinite(to) && to >= 0 ? Math.floor(to) : null
  }
  await repo.upsert(ctx, SETTING_KEYS.PANEL_DATE_FILTER, normalized)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setPanelDateFilter`,
    payload: { normalized }
  })
}
