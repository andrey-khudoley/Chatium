import LavaPaymentContract from '../../tables/lava_payment_contract.table'
import * as loggerLib from '../logger.lib'

const LOG_MODULE = 'lib/admin/orders-metrics.lib'
/** Heap: `findAll` — максимум 1000 записей за запрос (`queryHeapRecords`). */
const HEAP_FIND_ALL_MAX = 1000
/** Сбор уникальных product/offer: до N строк последних контрактов (батчами по `HEAP_FIND_ALL_MAX`). */
const FILTER_OPTIONS_MAX_ROWS = 10000

export type OrdersMetricsFilter = {
  /** Unix ms, `created_at >= fromMs` */
  fromMs: number
  /** Unix ms, `created_at <= toMs` */
  toMs: number
  /** Heap `lava_product_id` */
  lavaProductId?: string
  /** Heap `lava_offer_id` */
  lavaOfferId?: string
}

export type CurrencyAmountRow = { currency: string; amount: number }

export type OrdersMetricsResult = {
  formedCount: number
  paidCount: number
  formedByCurrency: CurrencyAmountRow[]
  paidByCurrency: CurrencyAmountRow[]
}

/**
 * Собирает Heap-where по `created_at` и опционально product/offer (технические id Lava).
 */
export function buildPaymentContractWhere(f: OrdersMetricsFilter): Record<string, unknown> {
  const where: Record<string, unknown> = {
    created_at: { $gte: f.fromMs, $lte: f.toMs }
  }
  const pid = f.lavaProductId?.trim()
  const oid = f.lavaOfferId?.trim()
  if (pid) where.lava_product_id = pid
  if (oid) where.lava_offer_id = oid
  return where
}

function accumulateCurrency(
  target: Record<string, number>,
  currency: string,
  amount: number
): void {
  const c = currency?.trim() || '—'
  target[c] = (target[c] ?? 0) + amount
}

/**
 * Метрики по контрактам оплаты: счётчики через `countBy`, суммы — по батчам `findAll` + where (не filter в JS по всей таблице).
 */
export async function getOrdersMetrics(
  ctx: app.Ctx,
  filter: OrdersMetricsFilter
): Promise<OrdersMetricsResult> {
  const where = buildPaymentContractWhere(filter)

  // countBy: условия на верхнем уровне второго аргумента (как в repos/logs.repo countBySeverityAfter), не { where: … }
  const formedCount = await LavaPaymentContract.countBy(ctx, where)
  const paidCount = await LavaPaymentContract.countBy(ctx, {
    ...where,
    status: 'paid'
  })

  const formedRaw: Record<string, number> = {}
  const paidRaw: Record<string, number> = {}
  let offset = 0
  for (;;) {
    const rows = await LavaPaymentContract.findAll(ctx, {
      where,
      limit: HEAP_FIND_ALL_MAX,
      offset,
      order: [{ created_at: 'asc' }]
    })
    if (!rows.length) break
    for (const r of rows) {
      const amt = typeof r.amount === 'number' && !Number.isNaN(r.amount) ? r.amount : 0
      accumulateCurrency(formedRaw, r.currency ?? '', amt)
      if (r.status === 'paid') {
        accumulateCurrency(paidRaw, r.currency ?? '', amt)
      }
    }
    if (rows.length < HEAP_FIND_ALL_MAX) break
    offset += HEAP_FIND_ALL_MAX
  }

  const toSortedRows = (m: Record<string, number>): CurrencyAmountRow[] =>
    Object.entries(m)
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => a.currency.localeCompare(b.currency, 'ru'))

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] getOrdersMetrics`,
    payload: { formedCount, paidCount, filter }
  })

  return {
    formedCount,
    paidCount,
    formedByCurrency: toSortedRows(formedRaw),
    paidByCurrency: toSortedRows(paidRaw)
  }
}

export type ContractFilterOption = { id: string; label: string }

/**
 * Уникальные product/offer из последних контрактов (для подсказок фильтра).
 * Читает до `FILTER_OPTIONS_MAX_ROWS` строк батчами по `HEAP_FIND_ALL_MAX` (лимит Heap на `findAll`).
 */
export async function getContractFilterOptions(ctx: app.Ctx): Promise<{
  products: ContractFilterOption[]
  offers: ContractFilterOption[]
}> {
  const pMap = new Map<string, string>()
  const oMap = new Map<string, string>()
  let offset = 0
  while (offset < FILTER_OPTIONS_MAX_ROWS) {
    const rows = await LavaPaymentContract.findAll(ctx, {
      limit: HEAP_FIND_ALL_MAX,
      offset,
      order: [{ created_at: 'desc' }]
    })
    if (!rows.length) break
    for (const r of rows) {
      if (r.lava_product_id) {
        const lab = r.gc_product_title?.trim() || r.lava_product_id
        if (!pMap.has(r.lava_product_id)) pMap.set(r.lava_product_id, lab)
      }
      if (r.lava_offer_id) {
        const lab = r.gc_offer_title?.trim() || r.lava_offer_id
        if (!oMap.has(r.lava_offer_id)) oMap.set(r.lava_offer_id, lab)
      }
    }
    if (rows.length < HEAP_FIND_ALL_MAX) break
    offset += HEAP_FIND_ALL_MAX
  }
  const sort = (a: ContractFilterOption, b: ContractFilterOption) =>
    a.label.localeCompare(b.label, 'ru')
  return {
    products: [...pMap.entries()].map(([id, label]) => ({ id, label })).sort(sort),
    offers: [...oMap.entries()].map(([id, label]) => ({ id, label })).sort(sort)
  }
}
