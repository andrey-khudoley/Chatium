/**
 * GET /api/admin/dashboard/gatewayCounts — KPI gateway-панели Lava.Top.
 * Доступ: панель (`guardInternalApi`). Окно — глобальный фильтр панели (`panel_date_filter`).
 *
 * Возвращает counts: totalRequests/totalOk/totalErrors/okShare, avg/p95 latency,
 * topErrorCode/topErrorCount, upstream*, и webhook-метрики (webhookTotal/Forwarded/Failed).
 */

import { guardInternalApi } from '../../../lib/access/apiGuard'
import * as gatewayRequestLogRepo from '../../../repos/gatewayRequestLog.repo'
import * as gatewayUpstreamLogRepo from '../../../repos/gatewayUpstreamLog.repo'
import * as webhookEventRepo from '../../../repos/lavatopWebhookEvent.repo'
import * as loggerLib from '../../../lib/logger.lib'
import { getPanelDateFilter } from '../../../lib/settings.lib'
import { DASHBOARD_SCAN_LIMIT } from '../../../lib/gateway/constants'

const LOG_PATH = 'api/admin/dashboard/gatewayCounts'

/** p95 по возрастающе отсортированному массиву длительностей. */
function computeP95(sortedAsc: number[]): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.min(sortedAsc.length - 1, Math.floor(sortedAsc.length * 0.95))
  return sortedAsc[idx] ?? 0
}

/** Доля 0..1 с округлением до 3 знаков; 0 при нулевом знаменателе. */
function share(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 1000 : 0
}

export const gatewayCountsRoute = app.get('/', async (ctx, _req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  // Окно выборки — из глобального фильтра панели. null-границы → «за всё время» (undefined в repo).
  const filter = await getPanelDateFilter(ctx)
  const from = filter.from ?? undefined
  const to = filter.to ?? undefined

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { from: from ?? null, to: to ?? null }
  })

  const [
    totalRequests,
    totalErrors,
    upstreamTotal,
    upstreamOk,
    webhookTotal,
    webhookForwarded,
    webhookFailed
  ] = await Promise.all([
    gatewayRequestLogRepo.countInRange(ctx, from, to),
    gatewayRequestLogRepo.countErrorsInRange(ctx, from, to),
    gatewayUpstreamLogRepo.countInRange(ctx, from, to),
    gatewayUpstreamLogRepo.countOkInRange(ctx, from, to),
    webhookEventRepo.countInRange(ctx, from, to),
    webhookEventRepo.countForwardedOkInRange(ctx, from, to),
    webhookEventRepo.countForwardFailedInRange(ctx, from, to)
  ])

  const totalOk = Math.max(0, totalRequests - totalErrors)
  const upstreamErrors = Math.max(0, upstreamTotal - upstreamOk)

  // Производные метрики (avg/p95 latency, top errorCode) — по срезу последних записей диапазона.
  const recent = await gatewayRequestLogRepo.findRecentFiltered(ctx, DASHBOARD_SCAN_LIMIT, from, to)
  const durations: number[] = []
  const errorCodeCount: Record<string, number> = {}
  for (const row of recent) {
    if (typeof row.durationMs === 'number' && Number.isFinite(row.durationMs)) {
      durations.push(row.durationMs)
    }
    if (row.errorCode) {
      errorCodeCount[row.errorCode] = (errorCodeCount[row.errorCode] || 0) + 1
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

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { totalRequests, totalOk, totalErrors, upstreamTotal, webhookTotal }
  })

  return {
    success: true,
    dateFilter: { from: from ?? null, to: to ?? null },
    counts: {
      totalRequests,
      totalOk,
      totalErrors,
      okShare: share(totalOk, totalRequests),
      avgDurationMs,
      p95DurationMs,
      topErrorCode,
      topErrorCount,
      upstreamTotal,
      upstreamOk,
      upstreamErrors,
      upstreamOkShare: share(upstreamOk, upstreamTotal),
      webhookTotal,
      webhookForwarded,
      webhookFailed
    }
  }
})

export default gatewayCountsRoute
