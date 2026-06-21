// @shared-route
import { requireAccountRole } from '@app/auth'
import * as ordersMetricsLib from '../../../lib/admin/orders-metrics.lib'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/orders-metrics'

function parseMs(v: unknown): number | null {
  if (v === undefined || v === null) return null
  const s = typeof v === 'string' ? v.trim() : String(v)
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * GET /api/admin/orders-metrics?from=&to=&lavaProductId=&lavaOfferId=
 * `from` / `to` — Unix ms для Heap-where по `created_at`.
 */
export const getOrdersMetricsRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] запрос`,
    payload: { queryKeys: Object.keys(req.query ?? {}) }
  })

  const q = req.query ?? {}
  const fromMs = parseMs(q.from)
  const toMs = parseMs(q.to)
  if (fromMs === null || toMs === null) {
    return { success: false, error: 'Укажите параметры from и to (Unix ms, created_at)' }
  }
  if (fromMs > toMs) {
    return { success: false, error: 'from не может быть больше to' }
  }

  const lavaProductId = typeof q.lavaProductId === 'string' ? q.lavaProductId : ''
  const lavaOfferId = typeof q.lavaOfferId === 'string' ? q.lavaOfferId : ''

  try {
    const metrics = await ordersMetricsLib.getOrdersMetrics(ctx, {
      fromMs,
      toMs,
      lavaProductId: lavaProductId.trim() || undefined,
      lavaOfferId: lavaOfferId.trim() || undefined
    })
    return { success: true, ...metrics }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] ошибка`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
