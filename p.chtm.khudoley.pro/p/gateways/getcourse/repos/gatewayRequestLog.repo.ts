/**
 * Репозиторий журнала входящих запросов к gateway (gatewayRequestLog.table).
 * Слой работы с БД: только Heap-операции, без бизнес-логики.
 */

import GatewayRequestLog, { type GatewayRequestLogRow } from '../tables/gatewayRequestLog.table'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/gatewayRequestLog.repo'

export type GatewayRequestLogCreatePayload = {
  requestId: string
  op: string
  contour: string
  method: string
  rawArgs: unknown
  rawHeadersSafe: unknown
  clientHttpStatus: number
  errorCode: string
  durationMs: number
  requestedAt: number
}

export async function create(
  ctx: app.Ctx,
  data: GatewayRequestLogCreatePayload
): Promise<GatewayRequestLogRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create entry`,
    payload: { requestId: data.requestId, op: data.op, errorCode: data.errorCode }
  })
  const row = await GatewayRequestLog.create(ctx, data)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create exit`,
    payload: { requestId: data.requestId }
  })
  return row
}

export async function findRecent(ctx: app.Ctx, limit: number): Promise<GatewayRequestLogRow[]> {
  return GatewayRequestLog.findAll(ctx, {
    order: [{ requestedAt: 'desc' }],
    limit
  })
}

/**
 * Последние N записей с опциональным фильтром по `requestedAt` (Unix ms).
 * Если ни одна граница не задана — поведение эквивалентно `findRecent`.
 */
export async function findRecentFiltered(
  ctx: app.Ctx,
  limit: number,
  dateFrom?: number,
  dateTo?: number
): Promise<GatewayRequestLogRow[]> {
  if (dateFrom === undefined && dateTo === undefined) {
    return findRecent(ctx, limit)
  }
  const requestedAt =
    dateFrom !== undefined && dateTo !== undefined
      ? { $gte: dateFrom, $lte: dateTo }
      : dateFrom !== undefined
        ? { $gte: dateFrom }
        : { $lte: dateTo as number }
  return GatewayRequestLog.findAll(ctx, {
    where: { requestedAt },
    order: [{ requestedAt: 'desc' }],
    limit
  })
}

export async function findById(ctx: app.Ctx, id: string): Promise<GatewayRequestLogRow | null> {
  return GatewayRequestLog.findById(ctx, id)
}

export async function findByRequestId(
  ctx: app.Ctx,
  requestId: string
): Promise<GatewayRequestLogRow | null> {
  const rows = await GatewayRequestLog.findAll(ctx, {
    where: { requestId },
    limit: 1
  })
  return rows[0] ?? null
}

export async function countSince(ctx: app.Ctx, sinceTimestamp: number): Promise<number> {
  return GatewayRequestLog.countBy(ctx, {
    requestedAt: { $gte: sinceTimestamp }
  })
}

export async function countErrorsSince(ctx: app.Ctx, sinceTimestamp: number): Promise<number> {
  return GatewayRequestLog.countBy(ctx, {
    requestedAt: { $gte: sinceTimestamp },
    clientHttpStatus: { $gte: 400 }
  })
}

/** Диапазон `requestedAt` для countBy. Отсутствующая нижняя граница → с начала времён (0). */
function rangeFilter(dateFrom?: number, dateTo?: number): { $gte: number; $lte?: number } {
  const from = dateFrom ?? 0
  return dateTo !== undefined ? { $gte: from, $lte: dateTo } : { $gte: from }
}

/** Всего входящих запросов в диапазоне [from?, to?] (Unix ms). */
export async function countInRange(
  ctx: app.Ctx,
  dateFrom?: number,
  dateTo?: number
): Promise<number> {
  return GatewayRequestLog.countBy(ctx, {
    requestedAt: rangeFilter(dateFrom, dateTo)
  })
}

/** Запросов с HTTP-ответом клиенту ≥ 400 в диапазоне [from?, to?]. */
export async function countErrorsInRange(
  ctx: app.Ctx,
  dateFrom?: number,
  dateTo?: number
): Promise<number> {
  return GatewayRequestLog.countBy(ctx, {
    requestedAt: rangeFilter(dateFrom, dateTo),
    clientHttpStatus: { $gte: 400 }
  })
}
