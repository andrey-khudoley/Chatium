/**
 * GET /api/gateways/raw-webhook?id=<heapId> — полная raw-запись журнала webhook
 * вместе с сопутствующим контекстом со стороны браузера.
 *
 * Контекст («обогащение»):
 *   - `linkedRequests` — все записи `request_log` с тем же `orderNumber`
 *     (Admin создавал bill из браузера: orderNumber/amount/customerEmail/
 *     description/callbackUrl) с операциями createBill / getBill / cancelBill
 *     и др. Это «то, что прислал JS», поскольку gateway сохраняет
 *     `argsRedacted` (входной payload createBill) и `rawResponseBody` ответа.
 *   - `relatedWebhooks` — другие записи `webhook_log` с тем же `orderNumber`
 *     (повторы/refund после исходной оплаты).
 *
 * Поля `rawBody`/`rawQuery` всегда присутствуют в ответе (null, если запись
 * была создана старым кодом без этих колонок) — чтобы клиент мог отличить
 * «нет данных» от «поле не вернулось из API».
 *
 * Доступ: requireRealUser + requireInternalAccess (§1.11.8).
 */

import * as webhookLogRepo from '../../repos/webhookLog.repo'
import * as requestLogRepo from '../../repos/requestLog.repo'
import { guardInternalApi } from '../../lib/access/apiGuard'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/gateways/raw-webhook'

export const rawWebhookRoute = app.get('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const q = req.query as Record<string, unknown> | undefined
  const idRaw = q?.id
  const id =
    typeof idRaw === 'string' ? idRaw.trim() : typeof idRaw === 'number' ? String(idRaw) : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { id: id || null }
  })

  if (!id) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] id_missing`,
      payload: {}
    })
    return { success: false, error: 'Параметр id обязателен' }
  }

  const row = await webhookLogRepo.findById(ctx, id)

  if (!row) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] exit`,
      payload: { id, found: false }
    })
    return { success: true, entry: null }
  }

  const orderNumber = row.orderNumber || ''
  const linkedRequests = orderNumber ? await requestLogRepo.findByOrderNumber(ctx, orderNumber) : []
  const relatedWebhooksAll = orderNumber
    ? await webhookLogRepo.findByOrderNumber(ctx, orderNumber)
    : []
  const relatedWebhooks = relatedWebhooksAll.filter((w) => w.id !== row.id)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: {
      id,
      orderNumber,
      linkedRequestsCount: linkedRequests.length,
      relatedWebhooksCount: relatedWebhooks.length
    }
  })

  return {
    success: true,
    entry: {
      id: row.id,
      number: row.number,
      orderNumber: row.orderNumber,
      type: row.type,
      status: row.status,
      method: row.method,
      amount: row.amount,
      email: row.email ?? '',
      tokenValid: row.tokenValid,
      duplicate: row.duplicate,
      processedAt: row.processedAt,
      rawBody: row.rawBody ?? null,
      rawQuery: row.rawQuery ?? null,
      linkedRequests: linkedRequests.map((r) => ({
        id: r.id,
        requestId: r.requestId,
        op: r.op,
        orderNumber: r.orderNumber,
        argsRedacted: r.argsRedacted,
        clientHttpStatus: r.clientHttpStatus,
        ok: r.ok,
        errorCode: r.errorCode,
        lpHttpStatus: r.lpHttpStatus,
        lpSemanticRule: r.lpSemanticRule,
        lpNumericCode: r.lpNumericCode,
        durationMs: r.durationMs,
        requestedAt: r.requestedAt,
        rawResponseBody: r.rawResponseBody ?? null
      })),
      relatedWebhooks: relatedWebhooks.map((w) => ({
        id: w.id,
        number: w.number,
        type: w.type,
        status: w.status,
        method: w.method,
        amount: w.amount,
        duplicate: w.duplicate,
        processedAt: w.processedAt
      }))
    }
  }
})

export default rawWebhookRoute
