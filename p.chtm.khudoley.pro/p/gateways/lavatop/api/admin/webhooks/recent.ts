/**
 * GET /api/admin/webhooks/recent — последние N событий вебхуков Lava.Top (lavatopWebhookEvent).
 * Доступ: панель (`guardInternalApi`). Опц. query `limit`, `dateFrom`/`dateTo` (Unix ms) — фильтр
 * по `created_at`. Payload вебхука целиком не отдаётся (только мета и статус форварда).
 */

import { guardInternalApi } from '../../../lib/access/apiGuard'
import * as repo from '../../../repos/lavatopWebhookEvent.repo'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/webhooks/recent'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function parseLimit(value: unknown): number {
  const n =
    typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : NaN
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT
  return Math.min(Math.floor(n), MAX_LIMIT)
}

function parseBound(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.floor(n)
}

export const recentWebhooksRoute = app.get('/', async (ctx, req) => {
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
    event_type: r.event_type,
    lava_contract_id: r.lava_contract_id,
    processed: r.processed,
    processing_error: r.processing_error,
    forward_url: r.forward_url,
    forward_status_code: r.forward_status_code,
    forward_error: r.forward_error,
    created_at: r.created_at
  }))

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { count: entries.length }
  })

  return { success: true, entries }
})

export default recentWebhooksRoute
