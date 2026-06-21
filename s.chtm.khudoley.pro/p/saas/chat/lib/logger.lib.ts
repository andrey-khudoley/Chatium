import * as loggerSettings from './logger-settings.lib'
import * as serverLogsRepo from '../repos/server-logs.repo'

const CONFIG_TO_MAX_SEVERITY: Record<loggerSettings.LogLevel, number> = {
  Disable: -1,
  Error: 3,
  Warn: 4,
  Info: 6,
  Debug: 7
}

const SEVERITY_TO_LEVEL: Record<number, string> = {
  0: 'emergency',
  1: 'alert',
  2: 'critical',
  3: 'error',
  4: 'warning',
  5: 'notice',
  6: 'info',
  7: 'debug'
}

export type ServerLogEntry = {
  severity: number
  message: string
  payload?: unknown
}

function severityToLevelName(severity: number): string {
  const s = Math.max(0, Math.min(7, Math.floor(severity)))
  return SEVERITY_TO_LEVEL[s] ?? 'info'
}

type FormattedEntry = { timestamp: number; level: string; message: string }

function formatLogMessage(entry: FormattedEntry): string {
  const d = new Date(entry.timestamp)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const sec = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  const time = `${day}.${month}.${year} ${h}:${min}:${sec}.${ms}`
  const level = entry.level.toUpperCase()
  return `[${time}] [${level}] ${entry.message}`
}

/**
 * Нужно ли логировать сообщение с данным severity при текущем уровне.
 */
export function shouldLogByLevel(
  configuredLevel: loggerSettings.LogLevel,
  messageSeverity: number
): boolean {
  const maxSeverity = CONFIG_TO_MAX_SEVERITY[configuredLevel]
  if (maxSeverity < 0) return false
  return messageSeverity >= 0 && messageSeverity <= maxSeverity
}

/**
 * Записывает серверный лог: проверка уровня, ctx.log, ctx.account.log, Heap (server-logs).
 */
export async function writeServerLog(ctx: app.Ctx, entry: ServerLogEntry): Promise<void> {
  const configuredLevel = await loggerSettings.getLogLevel(ctx)
  if (!shouldLogByLevel(configuredLevel, entry.severity)) {
    return
  }

  const timestamp = Date.now()
  const level = severityToLevelName(entry.severity)
  const formattedEntry: FormattedEntry = { timestamp, level, message: entry.message }
  const formattedMessage = formatLogMessage(formattedEntry)

  const payloadObj =
    typeof entry.payload === 'object' && entry.payload !== null && !Array.isArray(entry.payload)
      ? (entry.payload as Record<string, unknown>)
      : {}
  const logPayload = { level, json: { ...payloadObj, message: entry.message } }

  ctx.log(formattedMessage)
  ctx.account.log(formattedMessage, logPayload)

  const payloadForHeap =
    entry.payload == null
      ? null
      : typeof entry.payload === 'string'
        ? entry.payload
        : JSON.stringify(entry.payload)

  await serverLogsRepo.create(ctx, {
    message: entry.message,
    payload: payloadForHeap,
    severity: entry.severity,
    level,
    timestamp
  })
}
