import Logs, { type LogsRow } from '../tables/logs.table'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/logs.repo'

/**
 * Репозиторий логов — слой работы с БД.
 * Только CRUD-операции, без бизнес-логики.
 */
/** create не логирует через writeServerLog, чтобы не было рекурсии (writeServerLog вызывает create). */
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
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] findAll entry`,
    payload: opts
  })
  const limit = opts.limit ?? 1000
  const offset = opts.offset ?? 0
  const rows = await Logs.findAll(ctx, {
    order: [{ timestamp: 'desc' }],
    limit,
    offset
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] findAll exit`,
    payload: { limit, offset, count: rows.length }
  })
  return rows
}

export async function findById(ctx: app.Ctx, id: string): Promise<LogsRow | null> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] findById entry`,
    payload: { id }
  })
  const row = await Logs.findById(ctx, id)
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] findById exit`,
    payload: { id, hasRow: !!row }
  })
  return row
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
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] findBeforeTimestamp entry`,
    payload: { beforeTimestamp, limit }
  })
  const rows = await Logs.findAll(ctx, {
    where: { timestamp: { $lt: beforeTimestamp } },
    order: [{ timestamp: 'desc' }],
    limit
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] findBeforeTimestamp exit`,
    payload: { beforeTimestamp, limit, count: rows.length }
  })
  return rows
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
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] countBySeverityAfter entry`,
    payload: { sinceTimestamp, severity }
  })
  const count = await Logs.countBy(ctx, {
    timestamp: { $gt: sinceTimestamp },
    severity
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] countBySeverityAfter exit`,
    payload: { sinceTimestamp, severity, count }
  })
  return count
}

/**
 * Количество ошибок (severity 0–3) после указанного timestamp.
 * Несколько countBy по диапазону severity, сумма.
 */
export async function countErrorsAfter(ctx: app.Ctx, sinceTimestamp: number): Promise<number> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] countErrorsAfter entry`,
    payload: { sinceTimestamp }
  })
  let total = 0
  for (const severity of ERROR_SEVERITIES) {
    const n = await countBySeverityAfter(ctx, sinceTimestamp, severity)
    total += n
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] countErrorsAfter severity`,
      payload: { severity, n, total }
    })
  }
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] countErrorsAfter exit`,
    payload: { sinceTimestamp, total }
  })
  return total
}

/**
 * Количество предупреждений (severity 4) после указанного timestamp.
 */
export async function countWarningsAfter(ctx: app.Ctx, sinceTimestamp: number): Promise<number> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] countWarningsAfter entry`,
    payload: { sinceTimestamp }
  })
  const count = await countBySeverityAfter(ctx, sinceTimestamp, WARN_SEVERITY)
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] countWarningsAfter exit`,
    payload: { sinceTimestamp, count }
  })
  return count
}
