/**
 * GET /api/gateways/recent-webhooks — последние записи webhook_log
 * (implementation-plan §1.8.4). Доступ: requireRealUser + requireInternalAccess (§1.11.8).
 */

import * as webhookLogRepo from '../../repos/webhookLog.repo'
import * as requestLogRepo from '../../repos/requestLog.repo'
import { guardInternalApi } from '../../lib/access/apiGuard'
import * as loggerLib from '../../lib/logger.lib'
import { RECENT_DEFAULT_LIMIT, RECENT_MAX_LIMIT } from '../../lib/gateway/constants'
import { getPanelDateFilter } from '../../lib/settings.lib'

const LOG_PATH = 'api/gateways/recent-webhooks'

function parseLimit(value: unknown): number {
  const n =
    typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : NaN
  if (!Number.isFinite(n) || n < 1) return RECENT_DEFAULT_LIMIT
  return Math.min(Math.floor(n), RECENT_MAX_LIMIT)
}

export const recentWebhooksRoute = app.get('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const limit = parseLimit((req.query as Record<string, unknown> | undefined)?.limit)
  const { from, to } = await getPanelDateFilter(ctx)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { limit, from: from ?? null, to: to ?? null }
  })

  const rows = await webhookLogRepo.findInRange(ctx, from, to, limit)

  // orderNumber LifePay в webhook не присылает (order=null). Берём его из исходного
  // createBill-запроса, связанного по correlationId, одним батч-запросом.
  const correlationIds = Array.from(
    new Set(rows.map((r) => r.correlationId).filter((c): c is string => !!c))
  )
  const orderByCorrelation = new Map<string, string>()
  if (correlationIds.length > 0) {
    const reqRows = await requestLogRepo.findByCorrelationIds(ctx, correlationIds)
    for (const rr of reqRows) {
      if (rr.correlationId && rr.orderNumber && !orderByCorrelation.has(rr.correlationId)) {
        orderByCorrelation.set(rr.correlationId, rr.orderNumber)
      }
    }
  }

  const entries = rows.map((r) => ({
    id: r.id,
    gatewayId: r.gatewayId ?? null,
    gatewayExternalId: r.gatewayExternalId ?? null,
    number: r.number,
    // приоритет: orderNumber из самого webhook (legacy), иначе из связанного запроса.
    orderNumber:
      r.orderNumber || (r.correlationId ? (orderByCorrelation.get(r.correlationId) ?? '') : ''),
    correlationId: r.correlationId ?? '',
    tokenValid: r.tokenValid,
    duplicate: r.duplicate,
    type: r.type,
    status: r.status,
    method: r.method,
    amount: r.amount,
    email: r.email ?? '',
    processedAt: r.processedAt
  }))

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { count: entries.length }
  })

  return { success: true, entries, hasMore: entries.length === limit }
})

export default recentWebhooksRoute
