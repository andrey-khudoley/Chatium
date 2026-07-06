/**
 * GET /api/gateways/log-search — универсальный поиск логов для диагностики (в т.ч. агентом).
 *
 * Два независимых, комбинируемых режима:
 *   1. `orderNumbers=<a,b,c>` — точный поиск по request_log + webhook_log за ВЕСЬ
 *      исторический диапазон (без учёта UI-фильтра панели «Фильтр по дате/времени»).
 *   2. `from`/`to` (Unix ms или ISO) либо `around`+`windowMinutes` — сквозной срез
 *      по ВСЕМ трём источникам (app Logs + request_log + webhook_log) за период —
 *      «что происходило вокруг этого момента», включая записи без привязки к
 *      конкретному orderNumber (например guard-отклонения webhook ДО записи в
 *      webhook_log — см. webhooks/lifepay §1/1a: token_missing/mismatch,
 *      webhook_rejected reason=correlationId_missing/correlationId_not_found —
 *      эти случаи никогда не попадают в webhook_log, только в app Logs).
 *
 * Если задан только `orderNumbers` (без периода) — окно для «окружающих» логов
 * вычисляется автоматически: ±windowMinutes (по умолчанию 30) вокруг найденных
 * таймстемпов request_log/webhook_log — и сразу возвращается как `surrounding`,
 * чтобы не делать второй запрос. Если совпадений нет (заказ не создавался через
 * эту панель) и `around` не передан — `surrounding: null`, вызывающий должен
 * повторить запрос с явным `around` (например, временем оплаты со стороны гейтвея).
 *
 * Severity Logs по умолчанию ограничен ≤4 (emergency..warning) — verbose entry/exit
 * (severity 6) не нужен для диагностики инцидента; `maxSeverity=7` — полная трассировка.
 *
 * Доступ: requireRealUser + requireInternalAccess (§1.11.8) — как и другие api/gateways/*.
 */

import * as requestLogRepo from '../../repos/requestLog.repo'
import * as webhookLogRepo from '../../repos/webhookLog.repo'
import * as logsRepo from '../../repos/logs.repo'
import type { RequestLogRow } from '../../tables/requestLog.table'
import type { WebhookLogRow } from '../../tables/webhookLog.table'
import type { LogsRow } from '../../tables/logs.table'
import { guardInternalApi } from '../../lib/access/apiGuard'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/gateways/log-search'

const DEFAULT_WINDOW_MINUTES = 30
const MAX_WINDOW_MINUTES = 24 * 60
const DEFAULT_SURROUNDING_LIMIT = 500
const MAX_SURROUNDING_LIMIT = 2000
const DEFAULT_MAX_SEVERITY = 4
const ALL_SEVERITIES = [0, 1, 2, 3, 4, 5, 6, 7]

function parseOrderNumbers(value: unknown): string[] {
  if (typeof value !== 'string') return []
  return Array.from(
    new Set(
      value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
  )
}

/** Принимает Unix ms («1783412345678») либо ISO-дату («2026-07-06T11:07:00»). */
function parseTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string' || !value.trim()) return undefined
  const trimmed = value.trim()
  const asNumber = Number(trimmed)
  if (Number.isFinite(asNumber) && /^-?\d+$/.test(trimmed)) return asNumber
  const asDate = Date.parse(trimmed)
  return Number.isFinite(asDate) ? asDate : undefined
}

function parseIntParam(value: unknown, def: number, max: number): number {
  const n =
    typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : NaN
  if (!Number.isFinite(n) || n < 0) return def
  return Math.min(Math.floor(n), max)
}

function mapRequestRow(r: RequestLogRow) {
  return {
    source: 'request' as const,
    id: r.id,
    at: r.requestedAt,
    gatewayId: r.gatewayId ?? null,
    requestId: r.requestId,
    op: r.op,
    orderNumber: r.orderNumber,
    correlationId: r.correlationId ?? null,
    clientHttpStatus: r.clientHttpStatus,
    ok: r.ok,
    errorCode: r.errorCode,
    lpSemanticRule: r.lpSemanticRule,
    durationMs: r.durationMs
  }
}

function mapWebhookRow(w: WebhookLogRow) {
  return {
    source: 'webhook' as const,
    id: w.id,
    at: w.processedAt,
    gatewayId: w.gatewayId ?? null,
    number: w.number,
    orderNumber: w.orderNumber,
    correlationId: w.correlationId ?? null,
    tokenValid: w.tokenValid,
    duplicate: w.duplicate,
    type: w.type,
    status: w.status,
    amount: w.amount
  }
}

function mapLogRow(l: LogsRow) {
  return {
    source: 'log' as const,
    id: l.id,
    at: l.timestamp,
    severity: l.severity,
    level: l.level,
    message: l.message,
    payload: l.payload
  }
}

export const logSearchRoute = app.get('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const q = (req.query as Record<string, unknown> | undefined) ?? {}
  const orderNumbers = parseOrderNumbers(q.orderNumbers)
  const explicitFrom = parseTimestamp(q.from)
  const explicitTo = parseTimestamp(q.to)
  const around = parseTimestamp(q.around)
  const windowMinutes = parseIntParam(q.windowMinutes, DEFAULT_WINDOW_MINUTES, MAX_WINDOW_MINUTES)
  const surroundingLimit = parseIntParam(q.limit, DEFAULT_SURROUNDING_LIMIT, MAX_SURROUNDING_LIMIT)
  const maxSeverity = parseIntParam(q.maxSeverity, DEFAULT_MAX_SEVERITY, 7)
  const severities = ALL_SEVERITIES.filter((s) => s <= maxSeverity)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: {
      orderNumbers,
      explicitFrom: explicitFrom ?? null,
      explicitTo: explicitTo ?? null,
      around: around ?? null,
      windowMinutes,
      maxSeverity
    }
  })

  // --- 1. Точный поиск по orderNumbers (весь исторический диапазон) ---
  const byOrder: Array<{
    orderNumber: string
    requests: ReturnType<typeof mapRequestRow>[]
    webhooks: ReturnType<typeof mapWebhookRow>[]
  }> = []
  const foundTimestamps: number[] = []

  for (const orderNumber of orderNumbers) {
    const [requests, webhooks] = await Promise.all([
      requestLogRepo.findByOrderNumber(ctx, orderNumber, 100),
      webhookLogRepo.findByOrderNumber(ctx, orderNumber)
    ])
    requests.forEach((r) => foundTimestamps.push(r.requestedAt))
    webhooks.forEach((w) => foundTimestamps.push(w.processedAt))
    byOrder.push({
      orderNumber,
      requests: requests.map(mapRequestRow),
      webhooks: webhooks.map(mapWebhookRow)
    })
  }

  // --- 2. Окно для «окружающих» логов: явный from/to, либо around±windowMinutes,
  //         либо (min..max найденных таймстемпов)±windowMinutes ---
  const windowMs = windowMinutes * 60_000
  let windowFrom: number | undefined = explicitFrom
  let windowTo: number | undefined = explicitTo

  if (windowFrom === undefined && windowTo === undefined) {
    const anchors: number[] = []
    if (around !== undefined) anchors.push(around)
    anchors.push(...foundTimestamps)
    if (anchors.length > 0) {
      windowFrom = Math.min(...anchors) - windowMs
      windowTo = Math.max(...anchors) + windowMs
    }
  }

  let surrounding: {
    logs: ReturnType<typeof mapLogRow>[]
    requests: ReturnType<typeof mapRequestRow>[]
    webhooks: ReturnType<typeof mapWebhookRow>[]
  } | null = null

  if (windowFrom !== undefined || windowTo !== undefined) {
    const [logs, requests, webhooks] = await Promise.all([
      logsRepo.findInRange(ctx, windowFrom, windowTo, surroundingLimit, severities),
      requestLogRepo.findInRange(ctx, windowFrom, windowTo, surroundingLimit),
      webhookLogRepo.findInRange(ctx, windowFrom, windowTo, surroundingLimit)
    ])
    surrounding = {
      logs: logs.map(mapLogRow),
      requests: requests.map(mapRequestRow),
      webhooks: webhooks.map(mapWebhookRow)
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: {
      orderNumbersCount: orderNumbers.length,
      windowFrom: windowFrom ?? null,
      windowTo: windowTo ?? null,
      surroundingLogsCount: surrounding?.logs.length ?? 0,
      surroundingRequestsCount: surrounding?.requests.length ?? 0,
      surroundingWebhooksCount: surrounding?.webhooks.length ?? 0
    }
  })

  return {
    success: true,
    byOrder,
    window:
      windowFrom !== undefined || windowTo !== undefined
        ? { from: windowFrom ?? null, to: windowTo ?? null }
        : null,
    surrounding
  }
})

export default logSearchRoute
