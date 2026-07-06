import { Logs } from '../tables/logs.table'
import type { LogsRow } from '../tables/logs.table'
import { collectLimitedPaged } from '../lib/heapPaging'
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
  opts: { limit?: number; offset?: number; severities?: number[] } = {}
): Promise<LogsRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findAll entry`,
    payload: opts
  })
  const limit = opts.limit ?? 1000
  const offset = opts.offset ?? 0
  const severities = Array.isArray(opts.severities) ? opts.severities : []
  const where = severities.length > 0 ? { severity: { $in: severities } } : undefined
  // Heap.findAll отдаёт максимум 1000 строк за вызов (008-heap.md); при limit > 1000
  // листаем страницами, иначе выборка тихо усекается.
  const rows = await collectLimitedPaged(
    (pageLimit, pageOffset) =>
      Logs.findAll(ctx, {
        where,
        order: [{ timestamp: 'desc' }],
        limit: pageLimit,
        offset: pageOffset
      }),
    limit,
    offset
  )
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findAll exit`,
    payload: { limit, offset, count: rows.length }
  })
  return rows
}

export async function findById(ctx: app.Ctx, id: string): Promise<LogsRow | null> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findById entry`,
    payload: { id }
  })
  const row = await Logs.findById(ctx, id)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
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
  limit: number,
  severities?: number[]
): Promise<LogsRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findBeforeTimestamp entry`,
    payload: { beforeTimestamp, limit }
  })
  const safeSeverities = Array.isArray(severities) ? severities : []
  const where =
    safeSeverities.length > 0
      ? { timestamp: { $lt: beforeTimestamp }, severity: { $in: safeSeverities } }
      : { timestamp: { $lt: beforeTimestamp } }
  const rows = await Logs.findAll(ctx, {
    where,
    order: [{ timestamp: 'desc' }],
    limit
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findBeforeTimestamp exit`,
    payload: { beforeTimestamp, limit, count: rows.length }
  })
  return rows
}

/** Кэп одного findAll (см. inner/docs/008-heap.md) — cursor-пагинация выше него. */
const HARD_BATCH = 1000

/**
 * Условие по `timestamp` для диапазона [from?, to?] + опциональный список severity.
 * Любая граница необязательна; без всего — `{}` (весь журнал).
 */
function rangeWhere(from?: number, to?: number, severities?: number[]): Record<string, unknown> {
  const cond: Record<string, number> = {}
  if (from !== undefined) cond.$gte = from
  if (to !== undefined) cond.$lt = to
  const where: Record<string, unknown> = {}
  if (Object.keys(cond).length > 0) where.timestamp = cond
  if (severities && severities.length > 0) where.severity = { $in: severities }
  return where
}

/**
 * Записи Logs в диапазоне дат [from?, to?] (Unix ms), свежие первыми. Опциональный
 * фильтр по списку severity. В отличие от `findAll`/`findBeforeTimestamp`, не привязан
 * к UI-фильтру панели — используется агентской диагностикой (api/gateways/log-search)
 * для «окружающих» логов вокруг найденного инцидента за произвольный период.
 * Cursor-пагинация по HARD_BATCH (см. request/webhookLog.repo.findInRange — тот же паттерн).
 */
export async function findInRange(
  ctx: app.Ctx,
  from?: number,
  to?: number,
  limit: number = 2000,
  severities?: number[]
): Promise<LogsRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findInRange entry`,
    payload: { from: from ?? null, to: to ?? null, limit, severities: severities ?? null }
  })

  const result: LogsRow[] = []
  let cursor: number | null = null

  while (result.length < limit) {
    const upper = cursor !== null ? cursor : to
    const where = rangeWhere(from, upper, severities)

    const remaining = limit - result.length
    const batchSize = Math.min(HARD_BATCH, remaining)

    const rows = await Logs.findAll(ctx, {
      where,
      order: [{ timestamp: 'desc' }],
      limit: batchSize
    })

    const last = rows[rows.length - 1]
    if (!last) break
    result.push(...rows)
    cursor = last.timestamp
    if (rows.length < batchSize) break
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findInRange exit`,
    payload: { from: from ?? null, to: to ?? null, count: result.length }
  })
  return result
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
    severity: 6,
    message: `[${LOG_MODULE}] countBySeverityAfter entry`,
    payload: { sinceTimestamp, severity }
  })
  const count = await Logs.countBy(ctx, {
    timestamp: { $gt: sinceTimestamp },
    severity
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
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
    severity: 6,
    message: `[${LOG_MODULE}] countErrorsAfter entry`,
    payload: { sinceTimestamp }
  })
  let total = 0
  for (const severity of ERROR_SEVERITIES) {
    const n = await countBySeverityAfter(ctx, sinceTimestamp, severity)
    total += n
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] countErrorsAfter severity`,
      payload: { severity, n, total }
    })
  }
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
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
    severity: 6,
    message: `[${LOG_MODULE}] countWarningsAfter entry`,
    payload: { sinceTimestamp }
  })
  const count = await countBySeverityAfter(ctx, sinceTimestamp, WARN_SEVERITY)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] countWarningsAfter exit`,
    payload: { sinceTimestamp, count }
  })
  return count
}
