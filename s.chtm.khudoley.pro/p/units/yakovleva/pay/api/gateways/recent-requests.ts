/**
 * GET /api/gateways/recent-requests — последние N записей request_log
 * (implementation-plan §1.8.4). Доступ: requireRealUser + requireInternalAccess (§1.11.8).
 *
 * Возвращает поля: время, requestId, op, clientHttpStatus, ok, errorCode,
 * lpSemanticRule, durationMs, orderNumber. Без полных тел запросов/ответов.
 */

import * as requestLogRepo from '../../repos/requestLog.repo'
import { guardInternalApi } from '../../lib/access/apiGuard'
import * as loggerLib from '../../lib/logger.lib'
import { RECENT_DEFAULT_LIMIT, RECENT_MAX_LIMIT } from '../../lib/gateway/constants'
import { getPanelDateFilter } from '../../lib/settings.lib'

const LOG_PATH = 'api/gateways/recent-requests'

function parseLimit(value: unknown): number {
  const n =
    typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : NaN
  if (!Number.isFinite(n) || n < 1) return RECENT_DEFAULT_LIMIT
  return Math.min(Math.floor(n), RECENT_MAX_LIMIT)
}

export const recentRequestsRoute = app.get('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const limit = parseLimit((req.query as Record<string, unknown> | undefined)?.limit)
  const { from, to } = await getPanelDateFilter(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { limit, from: from ?? null, to: to ?? null }
  })

  const rows = await requestLogRepo.findInRange(ctx, from, to, limit)

  const entries = rows.map((r) => ({
    id: r.id,
    gatewayId: r.gatewayId ?? null,
    requestId: r.requestId,
    op: r.op,
    orderNumber: r.orderNumber,
    clientHttpStatus: r.clientHttpStatus,
    ok: r.ok,
    errorCode: r.errorCode,
    lpSemanticRule: r.lpSemanticRule,
    lpNumericCode: r.lpNumericCode,
    durationMs: r.durationMs,
    requestedAt: r.requestedAt
  }))

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { count: entries.length }
  })

  return { success: true, entries, hasMore: entries.length === limit }
})

export default recentRequestsRoute
