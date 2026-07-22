import { sendDataToSocket } from '@app/socket'
import { getLogLevel } from './settings'
import type { BrokerLogLevelSetting } from './settings'
import { LOG_SOCKET_CHANNEL } from '../../config/env'

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'unknown'

export type ServerLogEntry = {
  level: LogLevel
  /** Человекочитаемый текст, без времени и уровня (платформа хранит их отдельно). */
  message: string
  /** Структурированный контекст → json_str. */
  payload?: unknown
  /** Плоские метки → kv. */
  marks?: Record<string, string | number>
}

// Строгость уровня — чем меньше число, тем строже (fatal — самый строгий).
// trace/unknown — debug-класс (план шаг 11).
const LEVEL_RANK: Record<LogLevel, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 4,
  unknown: 4
}

// Максимальный ранг, который пропускает настройка (§5.10.4).
const SETTING_MAX_RANK: Record<BrokerLogLevelSetting, number> = {
  Disable: -1,
  Error: 1,
  Warn: 2,
  Info: 3,
  Debug: 4
}

/** Чистая функция отсечки по уровню (§5.10.4) — экспортируется для функциональных тестов. */
export function shouldLog(setting: BrokerLogLevelSetting, level: LogLevel): boolean {
  const maxRank = SETTING_MAX_RANK[setting]
  if (maxRank < 0) return false
  return LEVEL_RANK[level] <= maxRank
}

export type SocketLogEvent = {
  type: 'new-log'
  data: {
    level: LogLevel
    message: string
    timestamp: number
    payload?: unknown
  }
}

/**
 * Чистая функция построения сокет-события (§5.10.5/§5.10.6.3) — payload кладётся
 * только при log_level='Debug'; на рабочих уровнях в канал уходит только message.
 * Экспортируется для функциональных тестов.
 */
export function buildSocketEvent(
  entry: ServerLogEntry,
  setting: BrokerLogLevelSetting
): SocketLogEvent {
  const timestamp = Date.now()
  const base = { level: entry.level, message: entry.message, timestamp }
  if (setting === 'Debug') {
    return { type: 'new-log', data: { ...base, payload: entry.payload } }
  }
  return { type: 'new-log', data: base }
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0')
}

/** Формат [DD.MM.YYYY HH:mm:ss.SSS] [LEVEL] message (§5.10.6.1). */
function formatConsoleLine(entry: ServerLogEntry): string {
  const d = new Date()
  const time = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
  return `[${time}] [${entry.level.toUpperCase()}] ${entry.message}`
}

/**
 * Единственная точка логирования брокера (§5.10). Прямые ctx.account.log в
 * остальном коде брокера запрещены — весь код логирует только через эту функцию.
 *
 * Три выхода после прохождения отсечки (§5.10.5/§5.10.6):
 * 1. ctx.console.log — отладочный вывод разработчику, не хранилище, payload всегда;
 * 2. ctx.account.log — единственный persistent-выход (ClickHouse account_logs);
 * 3. WebSocket — живой монитор, payload только на Debug; best-effort (try/catch).
 *
 * В payload/marks НИКОГДА не кладите authToken/token (секрет-гигиена, §5.1).
 */
export async function writeServerLog(ctx: RichUgcCtx, entry: ServerLogEntry): Promise<void> {
  const setting = await getLogLevel(ctx)
  if (!shouldLog(setting, entry.level)) return

  ctx.console.log(formatConsoleLine(entry), entry.payload)

  ctx.account.log(entry.message, { level: entry.level, json: entry.payload, kv: entry.marks })

  try {
    const event = buildSocketEvent(entry, setting)
    // sendDataToSocket типизирует data как JSONInputValue; наш payload — произвольный
    // unknown (структура лога), в узкую структуру не укладывается — as any для системного вызова.
    await sendDataToSocket(ctx, LOG_SOCKET_CHANNEL, event as any)
  } catch {
    // Сокет — best-effort живой монитор; сбой отправки не должен ронять логирование.
  }
}
