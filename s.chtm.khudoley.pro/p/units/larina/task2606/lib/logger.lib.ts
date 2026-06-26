/** Запись лога для серверной обработки. */
export type ServerLogEntry = {
  severity: number
  message: string
  payload?: unknown
}

/** Маппинг severity (0–7) в уровень логирования платформы. */
type AccountLogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'unknown'

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

/**
 * Записывает лог на сервере через ctx.account.log.
 * Упрощённый враппер без Heap-таблицы логов и WebSocket.
 */
export async function writeServerLog(ctx: app.Ctx, entry: ServerLogEntry): Promise<void> {
  const level = severityToLevelName(entry.severity)
  const accountLevel = severityToAccountLogLevel(entry.severity)

  const payloadObj =
    typeof entry.payload === 'object' && entry.payload !== null && !Array.isArray(entry.payload)
      ? (entry.payload as Record<string, unknown>)
      : {}

  ctx.account.log(`[${level.toUpperCase()}] ${entry.message}`, {
    level: accountLevel,
    json: { ...payloadObj, message: entry.message }
  })
}
