// @shared-route
import { requireAccountRole } from '@app/auth'
import * as ordersListLib from '../../../lib/admin/orders-list.lib'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/orders-list'

function parseMs(v: unknown): number | null {
  if (v === undefined || v === null) return null
  const s = typeof v === 'string' ? v.trim() : String(v)
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function parsePage(v: unknown): number {
  if (v === undefined || v === null) return 1
  const s = typeof v === 'string' ? v.trim() : String(v)
  const n = parseInt(s, 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

/**
 * GET /api/admin/orders-list?from=&to=&lavaProductId=&lavaOfferId=&page=
 * Список контрактов (заказы) с пагинацией по `ordersListLib.ORDERS_LIST_PAGE_SIZE`.
 */
export const getOrdersListRoute = app.get('/', async (ctx, req) => {
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
  const page = parsePage(q.page)

  try {
    const result = await ordersListLib.getOrdersListPage(
      ctx,
      {
        fromMs,
        toMs,
        lavaProductId: lavaProductId.trim() || undefined,
        lavaOfferId: lavaOfferId.trim() || undefined
      },
      page
    )
    return { success: true, ...result }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] ошибка`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
