/**
 * GET /api/gateways/analytics/summary — карточки аналитики
 * (implementation-plan §1.8.4). Доступ: requireRealUser + requireInternalAccess (§1.11.8).
 *
 * Окно выборки задаётся глобальным фильтром панели по дате/времени
 * (settings.PANEL_DATE_FILTER, [from?, to?] Unix ms). Если фильтр не задан —
 * учитываются все данные (до кэпа сканирования ANALYTICS_SCAN_LIMIT).
 *
 * Возвращает: dateFilter {from, to}, orders {created, paid, createdSum, paidSum}
 * (сводка для менеджера), requests {total, okShare, avgDurationMs, p95DurationMs,
 * topErrorCode}, webhooks {total, successShare, tokenValidShare}.
 *
 * Эндпоинт не возвращает секретов и не выводит полных тел запросов/ответов.
 */

import * as requestLogRepo from '../../../repos/requestLog.repo'
import * as webhookLogRepo from '../../../repos/webhookLog.repo'
import { guardInternalApi } from '../../../lib/access/apiGuard'
import * as loggerLib from '../../../lib/logger.lib'
import { ANALYTICS_SCAN_LIMIT } from '../../../lib/gateway/constants'
import { getPanelDateFilter } from '../../../lib/settings.lib'

const LOG_PATH = 'api/gateways/analytics/summary'

function computeP95(sortedAsc: number[]): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.min(sortedAsc.length - 1, Math.floor(sortedAsc.length * 0.95))
  return sortedAsc[idx] ?? 0
}

/**
 * Извлекает сумму заказа из args createBill (поле amount, рубли). Args может быть
 * любого типа (Heap.Any), поэтому проверяем структуру. Возвращает null, если суммы нет.
 */
function extractOrderAmount(args: unknown): number | null {
  if (!args || typeof args !== 'object') return null
  const raw = (args as Record<string, unknown>).amount
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const n = parseFloat(raw)
    if (Number.isFinite(n)) return n
  }
  return null
}

export const analyticsSummaryRoute = app.get('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  // Окно выборки — из глобального фильтра панели (Unix ms). Любая граница опциональна.
  const { from, to } = await getPanelDateFilter(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { from: from ?? null, to: to ?? null }
  })

  // Подсчёт total и ok через countBy.
  const requestsTotal = await requestLogRepo.countInRange(ctx, from, to)
  const requestsOk = await requestLogRepo.countOkInRange(ctx, from, to)

  // Для avg/p95 и top errorCode — выгрузка записей диапазона. findInRange
  // внутри ходит cursor-пагинацией по 1000 (платформенный кэп findAll); внешний
  // limit ограничивает общее число записей (берём свежие, если их больше кэпа).
  const recent = await requestLogRepo.findInRange(ctx, from, to, ANALYTICS_SCAN_LIMIT)
  const durations: number[] = []
  const errorCodeCount: Record<string, number> = {}
  // Сводка для менеджера: сформированные заказы = успешные createBill.
  // Суммы копим в копейках (целые), чтобы избежать дрейфа float.
  let ordersCreated = 0
  let ordersSumKopecks = 0
  for (const row of recent) {
    if (typeof row.durationMs === 'number' && Number.isFinite(row.durationMs)) {
      durations.push(row.durationMs)
    }
    if (!row.ok && row.errorCode) {
      errorCodeCount[row.errorCode] = (errorCodeCount[row.errorCode] || 0) + 1
    }
    if (row.op === 'createBill' && row.ok) {
      ordersCreated += 1
      const amount = extractOrderAmount(row.argsRedacted)
      if (amount !== null) ordersSumKopecks += Math.round(amount * 100)
    }
  }
  durations.sort((a, b) => a - b)
  const avgDurationMs =
    durations.length > 0 ? Math.round(durations.reduce((s, x) => s + x, 0) / durations.length) : 0
  const p95DurationMs = Math.round(computeP95(durations))

  let topErrorCode = ''
  let topErrorCount = 0
  for (const [code, count] of Object.entries(errorCodeCount)) {
    if (count > topErrorCount) {
      topErrorCount = count
      topErrorCode = code
    }
  }

  // Webhooks
  const webhooksTotal = await webhookLogRepo.countInRange(ctx, from, to)
  const webhooksSuccess = await webhookLogRepo.countStatusSuccessInRange(ctx, from, to)
  const webhooksTokenValid = await webhookLogRepo.countTokenValidInRange(ctx, from, to)

  // Сводка для менеджера: оплаченные заказы = успешные payment-webhook (без дублей).
  // amount хранится строкой → парсим и копим в копейках.
  const recentWebhooks = await webhookLogRepo.findInRange(ctx, from, to, ANALYTICS_SCAN_LIMIT)
  let ordersPaid = 0
  let paymentsSumKopecks = 0
  for (const w of recentWebhooks) {
    if (w.type === 'payment' && w.status === 'success' && !w.duplicate) {
      ordersPaid += 1
      const amount = parseFloat(w.amount)
      if (Number.isFinite(amount)) paymentsSumKopecks += Math.round(amount * 100)
    }
  }

  const result = {
    success: true,
    dateFilter: { from: from ?? null, to: to ?? null },
    orders: {
      created: ordersCreated,
      paid: ordersPaid,
      createdSum: ordersSumKopecks / 100,
      paidSum: paymentsSumKopecks / 100
    },
    requests: {
      total: requestsTotal,
      okShare: requestsTotal > 0 ? Math.round((requestsOk / requestsTotal) * 1000) / 1000 : 0,
      avgDurationMs,
      p95DurationMs,
      topErrorCode,
      topErrorCount
    },
    webhooks: {
      total: webhooksTotal,
      successShare:
        webhooksTotal > 0 ? Math.round((webhooksSuccess / webhooksTotal) * 1000) / 1000 : 0,
      tokenValidShare:
        webhooksTotal > 0 ? Math.round((webhooksTokenValid / webhooksTotal) * 1000) / 1000 : 0
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: {
      from: from ?? null,
      to: to ?? null,
      requestsTotal,
      webhooksTotal,
      ordersCreated,
      ordersPaid
    }
  })

  return result
})

export default analyticsSummaryRoute
