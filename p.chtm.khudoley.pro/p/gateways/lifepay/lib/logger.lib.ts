import * as settingsLib from './settings.lib'
import * as logsRepo from '../repos/logs.repo'
import { sendDataToSocket } from '@app/socket'
import { request } from '@app/request'

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

/** Уровень логирования платформы (значения совпадают с типом параметра `ctx.account.log`). */
type AccountLogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'unknown'

/** Маппинг severity (0–7) в уровень логирования платформы (тип параметра `ctx.account.log`). */
const SEVERITY_TO_ACCOUNT_LEVEL: Record<number, AccountLogLevel> = {
  0: 'fatal',
  1: 'fatal',
  2: 'fatal',
  3: 'error',
  4: 'warn',
  5: 'info',
  6: 'info',
  7: 'debug'
}

function severityToAccountLogLevel(severity: number): AccountLogLevel {
  const s = Math.max(0, Math.min(7, Math.floor(severity)))
  return SEVERITY_TO_ACCOUNT_LEVEL[s] ?? 'info'
}

/** Внутренняя запись с timestamp и level, вычисленными в lib. */
type FormattedEntry = { timestamp: number; level: string; message: string }

/**
 * Форматирует строку вывода лога: [DD.MM.YYYY HH:mm:ss.SSS] [LEVEL] message
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
 * Определяет, включать ли payload (сырые данные) в лог.
 *
 * - Debug: payload включается ВСЕГДА (полная карта вызовов с данными).
 * - Info и ниже: payload НЕ включается — видна только карта вызовов (сообщения).
 */
function shouldIncludePayload(configuredLevel: settingsLib.LogLevel): boolean {
  return configuredLevel === 'Debug'
}

/**
 * Записывает лог на сервере: проверяет уровень, при прохождении — ctx.log (только сообщение),
 * ctx.account.log (сообщение + payload), запись в Heap, WebSocket, внешний URL (fire-and-forget).
 *
 * Payload (сырые данные) включается во все выходы ТОЛЬКО при уровне Debug.
 * При Info и ниже записывается только текст сообщения — карта вызовов без данных.
 */
export async function writeServerLog(ctx: app.Ctx, entry: ServerLogEntry): Promise<void> {
  const configuredLevel = await settingsLib.getLogLevel(ctx)
  const isDebug = configuredLevel === 'Debug'

  if (isDebug) {
    ;(ctx.log as (msg: string) => void)(
      `[DEBUG] [lib/logger.lib] writeServerLog entry | severity=${entry.severity} msg=${entry.message.slice(0, 80)}`
    )
  }

  if (!shouldLogByLevel(configuredLevel, entry.severity)) {
    if (isDebug) {
      ;(ctx.log as (msg: string) => void)(
        `[DEBUG] [lib/logger.lib] writeServerLog skip: level=${configuredLevel} severity=${entry.severity}`
      )
    }
    return
  }

  const timestamp = Date.now()
  const level = severityToLevelName(entry.severity)
  const formattedEntry: FormattedEntry = { timestamp, level, message: entry.message }
  const formattedMessage = formatLogMessage(formattedEntry)

  const includePayload = shouldIncludePayload(configuredLevel)
  const effectivePayload = includePayload ? entry.payload : undefined

  const payloadObj =
    includePayload &&
    typeof effectivePayload === 'object' &&
    effectivePayload !== null &&
    !Array.isArray(effectivePayload)
      ? (effectivePayload as Record<string, unknown>)
      : {}
  const logPayload = {
    level: severityToAccountLogLevel(entry.severity),
    json: { ...payloadObj, message: entry.message }
  }

  ;(ctx.log as (msg: string) => void)(formattedMessage)
  ctx.account.log(formattedMessage, logPayload)

  if (isDebug) {
    ;(ctx.log as (msg: string) => void)(
      `[DEBUG] [lib/logger.lib] writeServerLog ctx.log+account.log done`
    )
  }

  const payloadForHeap =
    effectivePayload == null
      ? null
      : typeof effectivePayload === 'string'
        ? effectivePayload
        : JSON.stringify(effectivePayload)

  await logsRepo.create(ctx, {
    message: entry.message,
    payload: payloadForHeap,
    severity: entry.severity,
    level,
    timestamp
  })

  if (isDebug) {
    ;(ctx.log as (msg: string) => void)('[DEBUG] [lib/logger.lib] writeServerLog Heap create done')
  }

  const socketId = getAdminLogsSocketId(ctx)
  await sendDataToSocket(ctx, socketId, {
    type: 'new-log',
    data: {
      severity: entry.severity,
      level,
      args: effectivePayload !== undefined ? [entry.message, effectivePayload] : [entry.message],
      timestamp
    }
  } as any)

  if (isDebug) {
    ;(ctx.log as (msg: string) => void)('[DEBUG] [lib/logger.lib] writeServerLog WebSocket sent')
  }

  const webhook = await settingsLib.getLogWebhook(ctx)
  if (webhook.enable && webhook.url && webhook.url.trim() !== '') {
    const url = webhook.url.trim()
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
    const webhookPayload = includePayload
      ? entry
      : { severity: entry.severity, message: entry.message }
    request({
      url: fullUrl,
      method: 'post',
      json: { log: { ...webhookPayload, timestamp, level } },
      throwHttpErrors: false,
      timeout: 10000
    }).catch(() => {
      /* fire-and-forget */
    })
    if (isDebug) {
      ;(ctx.log as (msg: string) => void)(
        `[DEBUG] [lib/logger.lib] writeServerLog webhook POST fired url=${fullUrl}`
      )
    }
  } else if (isDebug) {
    ;(ctx.log as (msg: string) => void)(
      `[DEBUG] [lib/logger.lib] writeServerLog webhook disabled | enable=${webhook.enable} url=${webhook.url}`
    )
  }

  if (isDebug) {
    ;(ctx.log as (msg: string) => void)('[DEBUG] [lib/logger.lib] writeServerLog exit')
  }
}
