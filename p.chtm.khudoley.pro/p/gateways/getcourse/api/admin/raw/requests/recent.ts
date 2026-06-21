/**
 * GET /api/admin/raw/requests/recent — последние N записей gatewayRequestLog
 * (мета-поля, БЕЗ rawArgs/rawHeadersSafe). Доступ: панель (Admin или активный грант).
 *
 * Опциональные query-параметры dateFrom/dateTo (Unix ms) — фильтр по requestedAt.
 * При отсутствии границ — поведение без изменений (последние N).
 */

import { guardInternalApi } from '../../../../lib/access/apiGuard'

import * as repo from '../../../../repos/gatewayRequestLog.repo'
import * as loggerLib from '../../../../lib/logger.lib'

const LOG_PATH = 'api/admin/raw/requests/recent'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function parseLimit(value: unknown): number {
  const n =
    typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : NaN
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT
  return Math.min(Math.floor(n), MAX_LIMIT)
}

/** Парсит границу фильтра (Unix ms): число > 0 → значение, иначе undefined. */
function parseBound(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.floor(n)
}

export const recentGatewayRequestsRoute = app.get('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const query = (req.query as Record<string, unknown> | undefined) ?? {}
  const limit = parseLimit(query.limit)
  const dateFrom = parseBound(query.dateFrom)
  const dateTo = parseBound(query.dateTo)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { limit, dateFrom: dateFrom ?? null, dateTo: dateTo ?? null }
  })

  const rows = await repo.findRecentFiltered(ctx, limit, dateFrom, dateTo)

  const entries = rows.map((r) => ({
    id: r.id,
    requestId: r.requestId,
    op: r.op,
    contour: r.contour,
    method: r.method,
    clientHttpStatus: r.clientHttpStatus,
    errorCode: r.errorCode,
    durationMs: r.durationMs,
    requestedAt: r.requestedAt
  }))

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { count: entries.length }
  })

  return { success: true, entries }
})

export default recentGatewayRequestsRoute
