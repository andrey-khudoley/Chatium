import * as settingsLib from './settings.lib'
import * as logsRepo from '../repos/logs.repo'
import { sendDataToSocket } from '@app/socket'
import { request } from '@app/request'

/**
 * Уровни severity (syslog RFC 5424): 0 emergency, 1 alert, 2 critical, 3 error, 4 warning, 5 notice, 6 info, 7 debug.
 * В настройках: Disable (ничего), Error (3), Warn (4), Info (6), Debug (7).
 * Логируем сообщение, если severity сообщения <= порога настройки (т.е. error/warn всегда видны при уровне Info и выше).
 */
/** Порог по строгости syslog для каждой настройки уровня (меньше число — строже). */
const CONFIG_TO_MAX_SEVERITY: Record<settingsLib.LogLevel, number> = {
  Disable: -1,
  Error: 3,
  Warn: 4,
  Info: 6,
  Debug: 7
}

/** Хэш для глобальной уникальности канала логов. */
const LOG_SOCKET_HASH = 'a7f2b9c1'

/**
 * Идентификатор сокета для стрима логов админки. Хэш обеспечивает глобальную уникальность.
 */
export function getAdminLogsSocketId(_ctx: app.Ctx): string {
  return `admin-logs-${LOG_SOCKET_HASH}`
}

/** Запись лога для серверной обработки (message — текст, при необходимости с именем модуля; payload — JSON с контекстом). */
export type ServerLogEntry = {
  severity: number
  message: string
  payload?: unknown
}

/** Маппинг severity (0–7) в читаемое имя уровня для префикса. */
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

function severityToLevelName(severity: number): string {
  const s = Math.max(0, Math.min(7, Math.floor(severity)))
  return SEVERITY_TO_LEVEL[s] ?? 'info'
}

/** Внутренняя запись с timestamp и level, вычисленными в lib. */
type FormattedEntry = { timestamp: number; level: string; message: string }

/**
 * Форматирует строку вывода лога: [DD.MM.YYYY HH:mm:ss.SSS] [LEVEL] message
 * Пробелы между группами в скобках, чтобы путь/модуль в тексте сообщения не сливался с префиксом.
 */
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
 * Проверяет, нужно ли логировать сообщение с данным severity при текущей настройке уровня.
 * Логируем, когда severity сообщения <= порога (сообщение не строже порога).
 */
export function shouldLogByLevel(
  configuredLevel: settingsLib.LogLevel,
  messageSeverity: number
): boolean {
  const maxSeverity = CONFIG_TO_MAX_SEVERITY[configuredLevel]
  if (maxSeverity < 0) return false
  return messageSeverity >= 0 && messageSeverity <= maxSeverity
}

/**
 * Записывает лог на сервере: проверяет уровень, при прохождении — ctx.log, ctx.account.log,
 * запись в Heap, отправка в WebSocket, отправка на внешний URL (fire-and-forget).
 */
export async function writeServerLog(ctx: app.Ctx, entry: ServerLogEntry): Promise<void> {
  const configuredLevel = await settingsLib.getLogLevel(ctx)
  if (!shouldLogByLevel(configuredLevel, entry.severity)) {
    return
  }

  const timestamp = Date.now()
  const level = severityToLevelName(entry.severity)
  const formattedEntry: FormattedEntry = { timestamp, level, message: entry.message }

  const payloadObj =
    typeof entry.payload === 'object' && entry.payload !== null && !Array.isArray(entry.payload)
      ? (entry.payload as Record<string, unknown>)
      : {}
  const logPayload = { level, json: { ...payloadObj, message: entry.message } }
  const formattedMessage = formatLogMessage(formattedEntry)

  ;(ctx.log as (msg: string, opts?: unknown) => void)(formattedMessage, logPayload)
  ctx.account.log(formattedMessage, logPayload)

  const payloadForHeap =
    entry.payload == null
      ? null
      : typeof entry.payload === 'string'
        ? entry.payload
        : JSON.stringify(entry.payload)

  await logsRepo.create(ctx, {
    message: entry.message,
    payload: payloadForHeap,
    severity: entry.severity,
    level,
    timestamp
  })

  const socketId = getAdminLogsSocketId(ctx)
  await sendDataToSocket(ctx, socketId, {
    type: 'new-log',
    data: {
      severity: entry.severity,
      level,
      args: [entry.message, entry.payload],
      timestamp
    }
  } as any)

  const webhook = await settingsLib.getLogWebhook(ctx)
  if (webhook.enable && webhook.url && webhook.url.trim() !== '') {
    const url = webhook.url.trim()
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
    request({
      url: fullUrl,
      method: 'post',
      json: { log: { ...entry, timestamp, level } },
      throwHttpErrors: false,
      timeout: 10000
    }).catch(() => {
      /* fire-and-forget: не блокируем и не логируем ошибку вебхука */
    })
  }
}
