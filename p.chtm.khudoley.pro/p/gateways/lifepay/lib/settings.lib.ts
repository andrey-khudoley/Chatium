import * as repo from '../repos/settings.repo'
import * as loggerLib from './logger.lib'
import {
  LP_TEST_APIKEY as SHARED_LP_TEST_APIKEY,
  LP_TEST_LOGIN as SHARED_LP_TEST_LOGIN,
  isValidLpLogin
} from '../shared/gatewaySettingKeys'

const LOG_MODULE = 'lib/settings.lib'

/** Секретные ключи: их значения не должны попадать в логи. */
function isSecretSettingKey(key: string): boolean {
  return key === SHARED_LP_TEST_APIKEY
}

/** Безопасный payload для логов: маскирует значения секретных ключей. */
function loggableSettingPayload(key: string, value: unknown): { key: string; value: unknown } {
  return isSecretSettingKey(key) ? { key, value: '[redacted]' } : { key, value }
}

/** Ключи настроек */
export const SETTING_KEYS = {
  PROJECT_NAME: 'project_name',
  PROJECT_TITLE: 'project_title',
  LOG_LEVEL: 'log_level',
  LOGS_LIMIT: 'logs_limit',
  LOG_WEBHOOK: 'log_webhook',
  DASHBOARD_RESET_AT: 'dashboard_reset_at',
  LP_TEST_APIKEY: SHARED_LP_TEST_APIKEY,
  LP_TEST_LOGIN: SHARED_LP_TEST_LOGIN,
  // Глобальный фильтр панели по дате/времени (один на всё приложение).
  PANEL_DATE_FILTER: 'panel_date_filter'
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
  [SETTING_KEYS.PROJECT_NAME]: 'LifePay Gateway',
  [SETTING_KEYS.PROJECT_TITLE]: 'LifePay',
  [SETTING_KEYS.LOG_LEVEL]: 'Info',
  [SETTING_KEYS.LOGS_LIMIT]: '100',
  [SETTING_KEYS.LOG_WEBHOOK]: { enable: false, url: '' } as LogWebhookSetting,
  [SETTING_KEYS.DASHBOARD_RESET_AT]: null as number | null,
  [SETTING_KEYS.LP_TEST_APIKEY]: '',
  [SETTING_KEYS.LP_TEST_LOGIN]: ''
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
 * Сохранить настройку. Валидирует значение для известных ключей.
 */
export async function setSetting(ctx: app.Ctx, key: string, value: unknown): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting entry`,
    payload: loggableSettingPayload(key, value)
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
  } else if (key === SETTING_KEYS.LP_TEST_APIKEY) {
    const str = typeof value === 'string' ? value.trim() : ''
    if (!str) {
      throw new Error('lp_test_apikey: значение не должно быть пустым (после trim)')
    }
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LP_TEST_APIKEY branch`,
      payload: { length: str.length }
    })
  } else if (key === SETTING_KEYS.LP_TEST_LOGIN) {
    const str = typeof value === 'string' ? value.trim() : ''
    if (!str) {
      throw new Error('lp_test_login: значение не должно быть пустым (после trim)')
    }
    if (!isValidLpLogin(str)) {
      throw new Error('lp_test_login: ожидаются 11 цифр, первая 7 (формат 7XXXXXXXXXX)')
    }
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LP_TEST_LOGIN branch`,
      payload: { length: str.length }
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
  }

  await repo.upsert(ctx, key, normalized)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting exit`,
    payload: loggableSettingPayload(key, normalized)
  })
}
