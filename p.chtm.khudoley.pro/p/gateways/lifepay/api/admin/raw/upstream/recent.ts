/**
 * GET /api/admin/raw/upstream/recent — последние N записей gatewayUpstreamLog
 * (мета-поля, БЕЗ rawLpJson). Доступ: панель (Admin или активный грант).
 *
 * Опциональные query-параметры dateFrom/dateTo (Unix ms) — фильтр по sentAt.
 * При отсутствии границ — поведение без изменений (последние N).
 */

import { guardInternalApi } from '../../../../lib/access/apiGuard'

import * as repo from '../../../../repos/gatewayUpstreamLog.repo'
import * as loggerLib from '../../../../lib/logger.lib'

const LOG_PATH = 'api/admin/raw/upstream/recent'

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

export const recentGatewayUpstreamRoute = app.get('/', async (ctx, req) => {
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
    upstreamKind: r.upstreamKind,
    lpHttpStatus: r.lpHttpStatus,
    semanticRule: r.semanticRule,
    durationMs: r.durationMs,
    sentAt: r.sentAt
  }))

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { count: entries.length }
  })

  return { success: true, entries }
})

export default recentGatewayUpstreamRoute
