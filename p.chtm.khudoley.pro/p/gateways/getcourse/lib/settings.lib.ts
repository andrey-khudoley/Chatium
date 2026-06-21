import * as repo from '../repos/settings.repo'
import * as loggerLib from './logger.lib'
import {
  GC_DEVELOPER_API_KEY,
  GC_TEST_SCHOOL_API_KEY,
  GC_TEST_SCHOOL_HOST
} from '../shared/gatewaySettingKeys'

const LOG_MODULE = 'lib/settings.lib'

function isSecretHeapSettingKey(key: string): boolean {
  return key === GC_DEVELOPER_API_KEY || key === GC_TEST_SCHOOL_API_KEY
}

/** Ключи настроек */
export const SETTING_KEYS = {
  PROJECT_NAME: 'project_name',
  PROJECT_TITLE: 'project_title',
  LOG_LEVEL: 'log_level',
  LOGS_LIMIT: 'logs_limit',
  LOG_WEBHOOK: 'log_webhook',
  DASHBOARD_RESET_AT: 'dashboard_reset_at',
  GC_DEVELOPER_API_KEY,
  GC_TEST_SCHOOL_API_KEY,
  GC_TEST_SCHOOL_HOST,
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
  [SETTING_KEYS.PROJECT_NAME]: 'GetCourse Gateway',
  [SETTING_KEYS.PROJECT_TITLE]: 'GetCourse',
  [SETTING_KEYS.LOG_LEVEL]: 'Info',
  [SETTING_KEYS.LOGS_LIMIT]: '100',
  [SETTING_KEYS.LOG_WEBHOOK]: { enable: false, url: '' } as LogWebhookSetting,
  [SETTING_KEYS.DASHBOARD_RESET_AT]: null as number | null,
  [SETTING_KEYS.GC_DEVELOPER_API_KEY]: null as string | null,
  [SETTING_KEYS.GC_TEST_SCHOOL_API_KEY]: null as string | null,
  [SETTING_KEYS.GC_TEST_SCHOOL_HOST]: null as string | null
} as const

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
    payload: isSecretHeapSettingKey(key)
      ? { key, value: '[redacted]', result: '[redacted]' }
      : { key, value, result }
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
 * Мутации настроек (setSetting/deleteSetting/listArbitrarySettings/KNOWN_SETTING_KEYS)
 * вынесены в `./settings.mutations` ради лимита размера файла; реэкспортируются,
 * чтобы публичный API `lib/settings.lib` остался прежним.
 */
export {
  setSetting,
  deleteSetting,
  listArbitrarySettings,
  KNOWN_SETTING_KEYS
} from './settings.mutations'
