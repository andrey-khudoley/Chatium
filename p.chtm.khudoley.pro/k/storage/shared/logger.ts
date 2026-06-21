// @shared
/**
 * Логгер для браузера. Использует window.__BOOT__.logLevel.
 * Уровни — по стандарту syslog (RFC 5424): 0 Emergency … 7 Debug; -1 = логи выключены.
 */

export const LOG_LEVEL_OFF = -1

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

const CONFIG_LEVELS = ['Debug', 'Info', 'Warn', 'Error', 'Disable'] as const
type ConfigLevelName = (typeof CONFIG_LEVELS)[number]

const CONFIG_TO_MAX_SEVERITY: Record<ConfigLevelName, number> = {
  Disable: -1,
  Error: 3,
  Warn: 4,
  Info: 6,
  Debug: 7
}

function getBootLogLevel(): ConfigLevelName {
  if (typeof window === 'undefined') return 'Info'
  const boot = (window as unknown as { __BOOT__?: { logLevel?: unknown } }).__BOOT__
  const raw = boot?.logLevel
  if (raw === LOG_LEVEL_OFF || raw === -1 || raw === '-1') return 'Disable'
  if (typeof raw === 'string' && CONFIG_LEVELS.includes(raw as ConfigLevelName)) {
    return raw as ConfigLevelName
  }
  return 'Info'
}

export function shouldLog(severity: number): boolean {
  const config = getBootLogLevel()
  const maxSeverity = CONFIG_TO_MAX_SEVERITY[config]
  if (maxSeverity < 0) return false
  return severity >= 0 && severity <= maxSeverity
}

export type LogEntry = {
  severity: number
  level: 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug'
  args: unknown[]
  timestamp: number
}

type LogSink = (entry: LogEntry) => void
let logSink: LogSink | null = null

export function setLogSink(sink: LogSink | null): void {
  logSink = sink
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
      /* ignore */
    }
  }
}

export function logEmergency(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Emergency, 'emergency', (...a) => console.error('[Emergency]', ...a), ...args)
}
export function logAlert(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Alert, 'alert', (...a) => console.error('[Alert]', ...a), ...args)
}
export function logCritical(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Critical, 'critical', (...a) => console.error('[Critical]', ...a), ...args)
}
export function logError(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Error, 'error', (...a) => console.error(...a), ...args)
}
export function logWarning(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Warning, 'warning', (...a) => console.warn(...a), ...args)
}
export function logNotice(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Notice, 'notice', (...a) => console.log('[Notice]', ...a), ...args)
}
export function logInfo(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Informational, 'info', (...a) => console.log(...a), ...args)
}
export function logDebug(...args: unknown[]): void {
  emitLog(SYSLOG_SEVERITY.Debug, 'debug', (...a) => console.log('[Debug]', ...a), ...args)
}

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
