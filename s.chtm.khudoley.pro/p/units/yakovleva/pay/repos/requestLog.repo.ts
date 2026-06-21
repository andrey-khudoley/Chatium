/**
 * Репозиторий журнала исходящих вызовов gateway (implementation-plan §1.8.1).
 *
 * Слой работы с БД: только Heap-операции, без бизнес-логики.
 *
 * Поле `requestedAt` (Unix ms) — момент исходящего вызова к gateway. Названо
 * `requestedAt`, а не `createdAt`, чтобы не конфликтовать с системным полем
 * `createdAt: HsDateTime`, добавляемым Heap автоматически.
 */

import { RequestLog } from '../tables/requestLog.table'
import type { RequestLogRow } from '../tables/requestLog.table'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/requestLog.repo'

export type RequestLogCreatePayload = {
  requestId: string
  /** Идентификатор гейтвея (`'lifepay' | 'lavatop'`); опциональное legacy-поле. */
  gatewayId?: string
  op: string
  argsRedacted: unknown
  orderNumber: string
  correlationId?: string
  gcDealNumber?: string
  clientHttpStatus: number
  ok: boolean
  errorCode: string
  lpHttpStatus: number
  lpSemanticRule: string
  lpNumericCode: number
  durationMs: number
  requestedAt: number
  rawResponseBody: unknown
}

export async function create(ctx: app.Ctx, data: RequestLogCreatePayload): Promise<RequestLogRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create entry`,
    payload: {
      requestId: data.requestId,
      gatewayId: data.gatewayId ?? null,
      op: data.op,
      ok: data.ok,
      errorCode: data.errorCode,
      correlationId: data.correlationId ?? null
    }
  })
  const row = await RequestLog.create(ctx, {
    ...data,
    correlationId: data.correlationId || undefined,
    gatewayId: data.gatewayId || undefined,
    gcDealNumber: data.gcDealNumber || undefined
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create exit`,
    payload: { requestId: data.requestId }
  })
  return row
}

/** @deprecated используйте findInRange (учитывает фильтр по дате/времени). */
export async function findRecent(ctx: app.Ctx, limit: number): Promise<RequestLogRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findRecent entry`,
    payload: { limit }
  })
  const rows = await RequestLog.findAll(ctx, {
    order: [{ requestedAt: 'desc' }],
    limit
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findRecent exit`,
    payload: { limit, count: rows.length }
  })
  return rows
}

/** @deprecated используйте findInRange (учитывает фильтр по дате/времени). */
export async function findBeforeRequestedAt(
  ctx: app.Ctx,
  beforeRequestedAt: number,
  limit: number
): Promise<RequestLogRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findBeforeRequestedAt entry`,
    payload: { beforeRequestedAt, limit }
  })
  const rows = await RequestLog.findAll(ctx, {
    where: { requestedAt: { $lt: beforeRequestedAt } },
    order: [{ requestedAt: 'desc' }],
    limit
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findBeforeRequestedAt exit`,
    payload: { beforeRequestedAt, limit, count: rows.length }
  })
  return rows
}

export async function findById(ctx: app.Ctx, id: string): Promise<RequestLogRow | null> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findById entry`,
    payload: { id }
  })
  const rows = await RequestLog.findAll(ctx, {
    where: { id },
    limit: 1
  })
  const row = rows[0] ?? null
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findById exit`,
    payload: { id, found: !!row }
  })
  return row
}

export async function findByOrderNumber(
  ctx: app.Ctx,
  orderNumber: string,
  limit: number = 50
): Promise<RequestLogRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByOrderNumber entry`,
    payload: { orderNumber, limit }
  })
  const rows = await RequestLog.findAll(ctx, {
    where: { orderNumber },
    order: [{ requestedAt: 'desc' }],
    limit
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByOrderNumber exit`,
    payload: { orderNumber, count: rows.length }
  })
  return rows
}

/**
 * Записи request_log по списку correlationId (батч через `$in`). Используется
 * для обогащения списка webhook полем orderNumber: LifePay не возвращает наш
 * orderNumber в webhook, но он есть в исходном createBill-запросе, связанном по
 * correlationId. Пустой список → пустой результат (без запроса к Heap).
 * Лимит ограничен числом уникальных id (createBill даёт 1 запись на correlationId).
 */
export async function findByCorrelationIds(
  ctx: app.Ctx,
  correlationIds: string[]
): Promise<RequestLogRow[]> {
  if (correlationIds.length === 0) return []
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByCorrelationIds entry`,
    payload: { count: correlationIds.length }
  })
  const rows = await RequestLog.findAll(ctx, {
    where: { correlationId: { $in: correlationIds } },
    order: [{ requestedAt: 'desc' }],
    limit: correlationIds.length
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByCorrelationIds exit`,
    payload: { requested: correlationIds.length, found: rows.length }
  })
  return rows
}

export async function findByRequestId(
  ctx: app.Ctx,
  requestId: string
): Promise<RequestLogRow | null> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByRequestId entry`,
    payload: { requestId }
  })
  const rows = await RequestLog.findAll(ctx, {
    where: { requestId },
    limit: 1
  })
  const row = rows[0] ?? null
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByRequestId exit`,
    payload: { requestId, found: !!row }
  })
  return row
}

/**
 * Возвращает записи журнала с `requestedAt >= sinceTimestamp`, отсортированные
 * по убыванию (свежие — первыми). Внешний `limit` ограничивает общее количество
 * возвращаемых записей. Внутри идём cursor-пагинацией по 1000 (HARD_BATCH —
 * максимум Heap.findAll, кэп платформы).
 *
 * Пограничный случай: если несколько записей имеют одинаковый `requestedAt` ms
 * и стоят ровно на стыке батчей, одна-две могут не попасть в выборку (из-за
 * фильтра $lt по курсору). Для аналитики p95/avg это незначительно.
 */
const HARD_BATCH = 1000

/** @deprecated используйте findInRange(ctx, from, to) — обобщённый диапазон. */
export async function findRecentSince(
  ctx: app.Ctx,
  sinceTimestamp: number,
  limit: number = 5000
): Promise<RequestLogRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findRecentSince entry`,
    payload: { sinceTimestamp, limit }
  })

  const result: RequestLogRow[] = []
  let cursor: number | null = null

  while (result.length < limit) {
    const where: Record<string, unknown> =
      cursor === null
        ? { requestedAt: { $gte: sinceTimestamp } }
        : { requestedAt: { $gte: sinceTimestamp, $lt: cursor } }

    const remaining = limit - result.length
    const batchSize = Math.min(HARD_BATCH, remaining)

    const rows = await RequestLog.findAll(ctx, {
      where,
      order: [{ requestedAt: 'desc' }],
      limit: batchSize
    })

    const last = rows[rows.length - 1]
    if (!last) break
    result.push(...rows)
    cursor = last.requestedAt
    if (rows.length < batchSize) break
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findRecentSince exit`,
    payload: { sinceTimestamp, count: result.length }
  })
  return result
}

export async function countSince(ctx: app.Ctx, sinceTimestamp: number): Promise<number> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] countSince entry`,
    payload: { sinceTimestamp }
  })
  const count = await RequestLog.countBy(ctx, {
    requestedAt: { $gte: sinceTimestamp }
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] countSince exit`,
    payload: { sinceTimestamp, count }
  })
  return count
}

export async function countOkSince(ctx: app.Ctx, sinceTimestamp: number): Promise<number> {
  return RequestLog.countBy(ctx, {
    requestedAt: { $gte: sinceTimestamp },
    ok: true
  })
}

/**
 * Собирает условие по `requestedAt` для диапазона [from?, to?]. Любая граница
 * необязательна. Возвращает `{}` если границ нет (без фильтра по времени).
 */
function rangeWhere(from?: number, to?: number): Record<string, unknown> {
  const cond: Record<string, number> = {}
  if (from !== undefined) cond.$gte = from
  if (to !== undefined) cond.$lt = to
  return Object.keys(cond).length > 0 ? { requestedAt: cond } : {}
}

/**
 * Возвращает записи журнала в диапазоне дат [from?, to?] (Unix ms), свежие первыми.
 * Любая граница необязательна; без границ ведёт себя как «последние limit записей».
 * Внутри cursor-пагинация по 1000 (HARD_BATCH — кэп Heap.findAll), один `findAll`
 * никогда не запрашивает > 1000. Верхняя граница окна — `$lt: to`; при пагинации
 * курсор (минимальный requestedAt предыдущего батча) всегда < to, поэтому в
 * последующих батчах используется `$lt: cursor`.
 */
export async function findInRange(
  ctx: app.Ctx,
  from?: number,
  to?: number,
  limit: number = 5000
): Promise<RequestLogRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findInRange entry`,
    payload: { from: from ?? null, to: to ?? null, limit }
  })

  const result: RequestLogRow[] = []
  let cursor: number | null = null

  while (result.length < limit) {
    const cond: Record<string, number> = {}
    if (from !== undefined) cond.$gte = from
    const upper = cursor !== null ? cursor : to
    if (upper !== undefined) cond.$lt = upper
    const where: Record<string, unknown> = Object.keys(cond).length > 0 ? { requestedAt: cond } : {}

    const remaining = limit - result.length
    const batchSize = Math.min(HARD_BATCH, remaining)

    const rows = await RequestLog.findAll(ctx, {
      where,
      order: [{ requestedAt: 'desc' }],
      limit: batchSize
    })

    const last = rows[rows.length - 1]
    if (!last) break
    result.push(...rows)
    cursor = last.requestedAt
    if (rows.length < batchSize) break
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findInRange exit`,
    payload: { from: from ?? null, to: to ?? null, count: result.length }
  })
  return result
}

export async function countInRange(ctx: app.Ctx, from?: number, to?: number): Promise<number> {
  return RequestLog.countBy(ctx, rangeWhere(from, to))
}

export async function countOkInRange(ctx: app.Ctx, from?: number, to?: number): Promise<number> {
  return RequestLog.countBy(ctx, { ...rangeWhere(from, to), ok: true })
}

/**
 * Возвращает последние ok-записи по op + gatewayId + orderNumber начиная с sinceRequestedAt.
 * Используется кэшем идемпотентности (idempotentBillCache) для lookup createBill / createInvoice.
 * amount и currency НЕ колонки — не фильтруются здесь; сверка делается в вызывающем коде.
 */
export async function findLatestOkForIdempotency(
  ctx: app.Ctx,
  params: {
    op: string
    gatewayId: string
    orderNumber: string
    sinceRequestedAt: number
    limit?: number
  }
): Promise<RequestLogRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findLatestOkForIdempotency entry`,
    payload: {
      op: params.op,
      gatewayId: params.gatewayId,
      orderNumber: params.orderNumber,
      sinceRequestedAt: params.sinceRequestedAt
    }
  })
  const rows = await RequestLog.findAll(ctx, {
    where: {
      op: params.op,
      ok: true,
      gatewayId: params.gatewayId,
      orderNumber: params.orderNumber,
      requestedAt: { $gte: params.sinceRequestedAt }
    },
    order: [{ requestedAt: 'desc' }],
    limit: params.limit ?? 20
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findLatestOkForIdempotency exit`,
    payload: { op: params.op, orderNumber: params.orderNumber, count: rows.length }
  })
  return rows
}

/**
 * Последняя (по requestedAt) запись createBill по correlationId.
 * Используется dealResolveCache для извлечения gcDealNumber и email из сохранённого
 * лога без повторного вызова GC API. Возвращает null, если записей нет.
 */
export async function findLatestCreateBillByCorrelationId(
  ctx: app.Ctx,
  correlationId: string
): Promise<RequestLogRow | null> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findLatestCreateBillByCorrelationId entry`,
    payload: { correlationId }
  })
  const rows = await RequestLog.findAll(ctx, {
    where: { correlationId, op: 'createBill' },
    order: [{ requestedAt: 'desc' }],
    limit: 1
  })
  const row = rows[0] ?? null
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findLatestCreateBillByCorrelationId exit`,
    payload: { correlationId, found: !!row }
  })
  return row
}

/**
 * Сколько записей createBill в request_log по correlationId.
 * Используется webhook-guard'ом (legacy-strict): вебхук отклоняется,
 * если для переданного correlationId не найдено ни одного createBill.
 */
export async function countCreateBillByCorrelationId(
  ctx: app.Ctx,
  correlationId: string
): Promise<number> {
  if (!correlationId || !correlationId.trim()) return 0
  const count = await RequestLog.countBy(ctx, { correlationId, op: 'createBill' })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] countCreateBillByCorrelationId`,
    payload: { correlationId, count }
  })
  return count
}
