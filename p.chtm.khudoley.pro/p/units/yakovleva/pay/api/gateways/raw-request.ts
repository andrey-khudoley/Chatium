/**
 * GET /api/gateways/raw-request — полная raw-запись журнала исходящих вызовов.
 *
 * Принимает `?id=<heapId>` (приоритет) или `?requestId=<rid>`. Возвращает
 * сериализованный объект записи requestLog со всеми полями включая
 * `rawResponseBody` (отредактированный JSON ответа gateway).
 *
 * Доступ: requireRealUser + requireInternalAccess (§1.11.8). Тело ответа хранится
 * сырым (клиент — оператор ПД); структурная гигиена выполнена
 * `shared/prepareRawLog.prepareRawLog` на этапе записи (см. lib/gateway/recordRequestLog.ts).
 */

import * as requestLogRepo from '../../repos/requestLog.repo'
import { guardInternalApi } from '../../lib/access/apiGuard'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/gateways/raw-request'

export const rawRequestRoute = app.get('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const q = req.query as Record<string, unknown> | undefined
  const idRaw = q?.id
  const requestIdRaw = q?.requestId

  const id =
    typeof idRaw === 'string' ? idRaw.trim() : typeof idRaw === 'number' ? String(idRaw) : ''
  const requestId = typeof requestIdRaw === 'string' ? requestIdRaw.trim() : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { id: id || null, requestId }
  })

  let row = null
  if (id) {
    row = await requestLogRepo.findById(ctx, id)
  } else if (requestId) {
    row = await requestLogRepo.findByRequestId(ctx, requestId)
  } else {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] params_missing`,
      payload: {}
    })
    return { success: false, error: 'Параметр id или requestId обязателен' }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { found: !!row }
  })

  if (!row) {
    return { success: true, entry: null }
  }

  return {
    success: true,
    entry: {
      id: row.id,
      requestId: row.requestId,
      op: row.op,
      orderNumber: row.orderNumber,
      argsRedacted: row.argsRedacted,
      clientHttpStatus: row.clientHttpStatus,
      ok: row.ok,
      errorCode: row.errorCode,
      lpHttpStatus: row.lpHttpStatus,
      lpSemanticRule: row.lpSemanticRule,
      lpNumericCode: row.lpNumericCode,
      durationMs: row.durationMs,
      requestedAt: row.requestedAt,
      rawResponseBody: row.rawResponseBody
    }
  }
})

export default rawRequestRoute
