/**
 * GET /api/gateways/search-by-request-id?requestId=...
 * (implementation-plan §1.8.4).
 *
 * Поиск конкретной записи request_log + связанные webhook_log по orderNumber.
 * Доступ: requireRealUser + requireInternalAccess (§1.11.8). Без полных тел запросов/ответов и секретов.
 */

import * as requestLogRepo from '../../repos/requestLog.repo'
import * as webhookLogRepo from '../../repos/webhookLog.repo'
import type { WebhookLogRow } from '../../tables/webhookLog.table'
import { guardInternalApi } from '../../lib/access/apiGuard'
import * as loggerLib from '../../lib/logger.lib'
import { getPanelDateFilter } from '../../lib/settings.lib'
import { mergeWebhooksById } from '../../shared/correlation'

const LOG_PATH = 'api/gateways/search-by-request-id'

export const searchByRequestIdRoute = app.get('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const q = req.query as Record<string, unknown> | undefined
  const requestId = typeof q?.requestId === 'string' ? q.requestId.trim() : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { requestId }
  })

  if (!requestId) {
    return { success: false, error: 'requestId обязателен' }
  }

  // Поиск работает в пределах глобального фильтра: запись вне диапазона не находится.
  const { from, to } = await getPanelDateFilter(ctx)
  const found = await requestLogRepo.findByRequestId(ctx, requestId)
  const inRange =
    !!found &&
    (from === undefined || found.requestedAt >= from) &&
    (to === undefined || found.requestedAt < to)
  const row = inRange ? found : null

  // Связываем webhook по двум ключам: исторический orderNumber (если LifePay его
  // вернул) и наш correlationId (надёжный путь — LifePay orderNumber в webhook не
  // присылает). Результаты объединяем без дублей по id.
  let webhooks: unknown[] = []
  if (row) {
    const [byOrderNumber, byCorrelation] = await Promise.all([
      row.orderNumber
        ? webhookLogRepo.findByOrderNumberInRange(ctx, row.orderNumber, from, to)
        : Promise.resolve<WebhookLogRow[]>([]),
      row.correlationId
        ? webhookLogRepo.findByCorrelationIdInRange(ctx, row.correlationId, from, to)
        : Promise.resolve<WebhookLogRow[]>([])
    ])
    const merged = mergeWebhooksById(byOrderNumber, byCorrelation)
    webhooks = merged.map((r) => ({
      id: r.id,
      gatewayId: r.gatewayId ?? null,
      gatewayExternalId: r.gatewayExternalId ?? null,
      number: r.number,
      orderNumber: r.orderNumber,
      correlationId: r.correlationId ?? null,
      tokenValid: r.tokenValid,
      duplicate: r.duplicate,
      type: r.type,
      status: r.status,
      method: r.method,
      amount: r.amount,
      processedAt: r.processedAt
    }))
  }

  const request = row
    ? {
        id: row.id,
        gatewayId: row.gatewayId ?? null,
        requestId: row.requestId,
        op: row.op,
        orderNumber: row.orderNumber,
        correlationId: row.correlationId ?? null,
        argsRedacted: row.argsRedacted,
        clientHttpStatus: row.clientHttpStatus,
        ok: row.ok,
        errorCode: row.errorCode,
        lpHttpStatus: row.lpHttpStatus,
        lpSemanticRule: row.lpSemanticRule,
        lpNumericCode: row.lpNumericCode,
        durationMs: row.durationMs,
        requestedAt: row.requestedAt
      }
    : null

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: {
      requestId,
      found: !!row,
      hasCorrelationId: !!(row && row.correlationId),
      webhookCount: webhooks.length
    }
  })

  return { success: true, request, webhooks }
})

export default searchByRequestIdRoute
