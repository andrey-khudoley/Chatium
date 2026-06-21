// @shared
/**
 * Нативный console до возможного патча (удалённая отправка логов на сервер).
 * Иначе каждый emitLog шёл бы через перехватчик и дублировался в очереди.
 */
const nativeConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console)
}

/**
 * Логгер для браузера. Использует window.__BOOT__.logLevel (задаётся при серверной генерации).
 * Уровни — по стандарту syslog (RFC 5424): 0 Emergency … 7 Debug; -1 = логи выключены.
 * Логирует через console только если severity сообщения не строже настроенного порога.
 * Не импортирует lib — только клиентский код.
 */

/** Уровень «логи выключены вообще». Порог -1: ничего не выводим. */
export const LOG_LEVEL_OFF = -1

/** Уровни строгости syslog (RFC 5424), 0 = самая высокая */
export const SYSLOG_SEVERITY = {
  Emergency: 0,
  Alert: 1,
  Critical: 2,
  Error: 3,
  Warning: 4,
  Notice: 5,
  Informational: 6,
  Debug: 7
} as const

export type SyslogSeverityName = keyof typeof SYSLOG_SEVERITY

/** Допустимые значения настройки (совпадают с lib/settings.lib) */
const CONFIG_LEVELS = ['Debug', 'Info', 'Warn', 'Error', 'Disable'] as const
type ConfigLevelName = (typeof CONFIG_LEVELS)[number]

/**
 * Порог по строгости syslog для каждой настройки:
 * показываем сообщения с severity <= порога (меньше число — строже).
 */
const CONFIG_TO_MAX_SEVERITY: Record<ConfigLevelName, number> = {
  Disable: -1,
  Error: 3,
  Warn: 4,
  Info: 6, // Informational (7 = Debug)
  Debug: 7
}

function getBootLogLevel(): ConfigLevelName {
  if (typeof window === 'undefined') return 'Info'
  const boot = window.__BOOT__
  const raw = boot?.logLevel
  if (raw === LOG_LEVEL_OFF || raw === -1 || raw === '-1') return 'Disable'
  if (typeof raw === 'string' && CONFIG_LEVELS.includes(raw as ConfigLevelName)) {
    return raw as ConfigLevelName
  }
  return 'Info'
}

/**
 * Нужно ли выводить сообщение данного уровня syslog.
 * Логируем, когда настройка не Disable и severity сообщения не строже порога.
 */
export function shouldLog(severity: number): boolean {
  const config = getBootLogLevel()
  const maxSeverity = CONFIG_TO_MAX_SEVERITY[config]
  if (maxSeverity < 0) return false
  return severity >= 0 && severity <= maxSeverity
}

/** Запись лога для sink (дашборд) */
export type LogEntry = {
  severity: number
  level: 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug'
  args: unknown[]
  timestamp: number
}

type LogSink = (entry: LogEntry) => void

let logSink: LogSink | null = null

/** Регистрирует sink для отображения логов в дашборде. Вызов с null снимает. */
export function setLogSink(sink: LogSink | null): void {
  logSink = sink
  logDebug(`[shared/logger] setLogSink ${sink ? 'sink set' : 'sink cleared'}`)
}

function emitLog(
  severity: number,
  level: LogEntry['level'],
  consoleFn: (...a: unknown[]) => void,
  ...args: unknown[]
): void {
  if (!shouldLog(severity)) return
  consoleFn(...args)
  if (logSink) {
    try {
      logSink({ severity, level, args, timestamp: Date.now() })
    } catch {
      /* sink не должен ломать логирование */
    }
  }
}

export function logEmergency(...args: unknown[]): void {
  emitLog(
    SYSLOG_SEVERITY.Emergency,
    'emergency',
    (...a) => nativeConsole.error('[Emergency]', ...a),
    ...args
  )
}

export function logAlert(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Alert, 'alert', (...a) => nativeConsole.error('[Alert]', ...a), ...args)
}

export function logCritical(...args: unknown[]): void {
  emitLog(
    SYSLOG_SEVERITY.Critical,
    'critical',
    (...a) => nativeConsole.error('[Critical]', ...a),
    ...args
  )
}

export function logError(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Error, 'error', (...a) => nativeConsole.error(...a), ...args)
}

export function logWarning(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Warning, 'warning', (...a) => nativeConsole.warn(...a), ...args)
}

export function logNotice(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Notice, 'notice', (...a) => nativeConsole.log('[Notice]', ...a), ...args)
}

export function logInfo(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Informational, 'info', (...a) => nativeConsole.log(...a), ...args)
}

export function logDebug(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Debug, 'debug', (...a) => nativeConsole.log('[Debug]', ...a), ...args)
}

/** Обратная совместимость: logWarn = logWarning */
export const logWarn = logWarning

/** Провайдер логов с префиксом имени компонента */
export interface ComponentLogger {
  emergency: (...args: unknown[]) => void
  alert: (...args: unknown[]) => void
  critical: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  warning: (...args: unknown[]) => void
  notice: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
}

/**
 * Создаёт логгер с префиксом [componentName] для единообразия сообщений.
 */
export function createComponentLogger(componentName: string): ComponentLogger {
  const prefix = `[${componentName}]`
  return {
    emergency: (...args: unknown[]) => logEmergency(prefix, ...args),
    alert: (...args: unknown[]) => logAlert(prefix, ...args),
    critical: (...args: unknown[]) => logCritical(prefix, ...args),
    error: (...args: unknown[]) => logError(prefix, ...args),
    warning: (...args: unknown[]) => logWarning(prefix, ...args),
    notice: (...args: unknown[]) => logNotice(prefix, ...args),
    info: (...args: unknown[]) => logInfo(prefix, ...args),
    debug: (...args: unknown[]) => logDebug(prefix, ...args)
  }
}
