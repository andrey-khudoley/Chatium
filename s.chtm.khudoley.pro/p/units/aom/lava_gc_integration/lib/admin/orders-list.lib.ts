import LavaPaymentContract from '../../tables/lava_payment_contract.table'
import type { LavaPaymentContractRow } from '../../tables/lava_payment_contract.table'
import * as loggerLib from '../logger.lib'
import { buildPaymentContractWhere, type OrdersMetricsFilter } from './orders-metrics.lib'

const LOG_MODULE = 'lib/admin/orders-list.lib'

/** Пагинация списка заказов на странице (≤ лимита Heap `findAll` за раз). */
export const ORDERS_LIST_PAGE_SIZE = 50

export type OrderListItem = {
  id: string
  gc_order_id: string
  gc_user_id: string
  lava_contract_id: string
  lava_product_id: string
  lava_offer_id: string
  status: string
  amount: number
  currency: string
  buyer_email: string
  gc_product_title: string
  gc_offer_title: string
  payment_url: string
  created_at: number
  updated_at: number
}

function rowToItem(r: LavaPaymentContractRow): OrderListItem {
  return {
    id: r.id,
    gc_order_id: r.gc_order_id ?? '',
    gc_user_id: r.gc_user_id ?? '',
    lava_contract_id: r.lava_contract_id ?? '',
    lava_product_id: r.lava_product_id ?? '',
    lava_offer_id: r.lava_offer_id ?? '',
    status: r.status ?? '',
    amount: typeof r.amount === 'number' ? r.amount : 0,
    currency: r.currency ?? '',
    buyer_email: r.buyer_email ?? '',
    gc_product_title: r.gc_product_title ?? '',
    gc_offer_title: r.gc_offer_title ?? '',
    payment_url: r.payment_url ?? '',
    created_at: typeof r.created_at === 'number' ? r.created_at : 0,
    updated_at: typeof r.updated_at === 'number' ? r.updated_at : 0
  }
}

/**
 * Список контрактов с теми же фильтрами, что и метрики; сортировка по `created_at` desc.
 */
export async function getOrdersListPage(
  ctx: app.Ctx,
  filter: OrdersMetricsFilter,
  page: number
): Promise<{ total: number; rows: OrderListItem[]; page: number; pageSize: number }> {
  const pageSize = ORDERS_LIST_PAGE_SIZE
  const p = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1
  const where = buildPaymentContractWhere(filter)

  const total = await LavaPaymentContract.countBy(ctx, where)
  const offset = (p - 1) * pageSize

  const heapRows = await LavaPaymentContract.findAll(ctx, {
    where,
    limit: pageSize,
    offset,
    order: [{ created_at: 'desc' }]
  })

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] getOrdersListPage`,
    payload: { total, page: p, pageSize, returned: heapRows.length }
  })

  return {
    total,
    rows: heapRows.map(rowToItem),
    page: p,
    pageSize
  }
}
