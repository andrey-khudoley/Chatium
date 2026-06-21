import Logs from '../tables/logs.table'
import type { LogsRow } from '../tables/logs.table'

if (!Logs) {
  throw new Error(
    'Logs table is not initialized. ' +
      'Check if table "t__tg-ref-program__log__x7Kp9m" exists in Heap and is properly exported from tables/logs.table.ts'
  )
}

/**
 * Репозиторий логов — слой работы с БД.
 * Только CRUD-операции, без бизнес-логики.
 */
export async function create(
  ctx: app.Ctx,
  data: { message: string; payload: unknown; severity: number; level: string; timestamp: number }
): Promise<LogsRow> {
  return Logs.create(ctx, data)
}

export async function findAll(
  ctx: app.Ctx,
  opts: { limit?: number; offset?: number } = {}
): Promise<LogsRow[]> {
  return Logs.findAll(ctx, {
    order: [{ timestamp: 'desc' }],
    limit: opts.limit ?? 1000,
    offset: opts.offset ?? 0
  })
}

export async function findById(ctx: app.Ctx, id: string): Promise<LogsRow | null> {
  return Logs.findById(ctx, id)
}

/**
 * Получить логи старше указанного timestamp (для пагинации).
 * Возвращает записи с timestamp меньше указанного.
 * Использует нативную фильтрацию Heap API через where.
 */
export async function findBeforeTimestamp(
  ctx: app.Ctx,
  beforeTimestamp: number,
  limit: number
): Promise<LogsRow[]> {
  return Logs.findAll(ctx, {
    where: { timestamp: { $lt: beforeTimestamp } },
    order: [{ timestamp: 'desc' }],
    limit
  })
}

/** Severity ошибок (syslog): 0 Emergency, 1 Alert, 2 Critical, 3 Error. */
const ERROR_SEVERITIES = [0, 1, 2, 3] as const
/** Severity предупреждений (syslog): 4 Warning. */
const WARN_SEVERITY = 4

/**
 * Подсчёт записей с заданным severity после указанного timestamp (для дашборда).
 */
export async function countBySeverityAfter(
  ctx: app.Ctx,
  sinceTimestamp: number,
  severity: number
): Promise<number> {
  return Logs.countBy(ctx, {
    timestamp: { $gt: sinceTimestamp },
    severity
  })
}

/**
 * Количество ошибок (severity 0–3) после указанного timestamp.
 * Несколько countBy по диапазону severity, сумма.
 */
export async function countErrorsAfter(ctx: app.Ctx, sinceTimestamp: number): Promise<number> {
  let total = 0
  for (const severity of ERROR_SEVERITIES) {
    total += await countBySeverityAfter(ctx, sinceTimestamp, severity)
  }
  return total
}

/**
 * Количество предупреждений (severity 4) после указанного timestamp.
 */
export async function countWarningsAfter(ctx: app.Ctx, sinceTimestamp: number): Promise<number> {
  return countBySeverityAfter(ctx, sinceTimestamp, WARN_SEVERITY)
}
