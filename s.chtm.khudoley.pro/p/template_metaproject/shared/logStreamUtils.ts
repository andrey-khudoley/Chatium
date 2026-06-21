// @shared
/**
 * Чистые помощники монитора логов: типы потоков, форматирование записей,
 * построение отображаемого списка с разделителями по датам. Без состояния Vue —
 * переиспользуются composable useLogStream и его презентационными компонентами.
 */
import type { LogEntry } from './logger'

export type LogStreamKey = 'all' | 'info' | 'warn' | 'error'

export type LogDisplayItem =
  | { type: 'log'; entry: LogEntry; formattedTime: string; formattedMessage: string }
  | { type: 'divider'; date: string }

export const LOG_STREAM_TO_SEVERITIES: Record<LogStreamKey, number[]> = {
  all: [0, 1, 2, 3, 4, 5, 6, 7],
  info: [5, 6, 7],
  warn: [4],
  error: [0, 1, 2, 3]
}

export const LOG_STREAM_LABELS: Record<LogStreamKey, string> = {
  all: 'Весь поток',
  info: 'Инфо',
  warn: 'Предупреждения',
  error: 'Ошибки'
}

export const LOG_STREAM_KEYS: LogStreamKey[] = ['all', 'info', 'warn', 'error']

export function getSeveritiesQueryForStream(stream: LogStreamKey): string | undefined {
  if (stream === 'all') return undefined
  return LOG_STREAM_TO_SEVERITIES[stream].join(',')
}

export function entryMatchesStream(entry: LogEntry, stream: LogStreamKey): boolean {
  return LOG_STREAM_TO_SEVERITIES[stream].includes(entry.severity)
}

export function formatLogTime(timestamp: number): string {
  const d = new Date(timestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

export function formatLogMessage(e: LogEntry): string {
  return e.args
    .map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)))
    .join(' ')
}

export function formatDateDivider(timestamp: number): string {
  const d = new Date(timestamp)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

export function getDateKey(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Записи приложения уже показаны через setLogSink; сервер шлёт тот же лог по WebSocket — пропускаем дубль. */
export function isBrowserSinkEchoFromSocket(entry: LogEntry): boolean {
  const p = entry.args[1]
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false
  const o = p as { source?: string; channel?: string }
  return o.source === 'browser' && o.channel === 'sink'
}

/** Построить отображаемый список (свежие сверху) с разделителями по датам. */
export function buildDisplayedLogs(entries: LogEntry[]): LogDisplayItem[] {
  if (!entries.length) return []
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp)
  const items: LogDisplayItem[] = []
  let lastDateKey = ''
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]
    if (!entry) continue
    const dateKey = getDateKey(entry.timestamp)
    if (i > 0 && dateKey !== lastDateKey) {
      items.push({ type: 'divider', date: formatDateDivider(entry.timestamp) })
    }
    lastDateKey = dateKey
    items.push({
      type: 'log',
      entry,
      formattedTime: formatLogTime(entry.timestamp),
      formattedMessage: formatLogMessage(entry)
    })
  }
  return items
}
