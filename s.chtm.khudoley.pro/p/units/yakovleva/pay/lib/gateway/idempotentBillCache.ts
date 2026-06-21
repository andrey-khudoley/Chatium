/**
 * Кэш идемпотентности createBill (LifePay) и createInvoice (Lava.Top).
 *
 * Контракт ключа:
 *   LifePay  — orderNumber (= dealIdNormalized) + amount (валюта подразумевается RUB,
 *              в сверке НЕ участвует, т.к. в args нет currency).
 *   Lava.Top — orderNumber (= correlationId = dealIdNormalized) + currency + amount
 *              (= convert.amount, сумма в выбранной валюте). Если цена заказа изменилась
 *              в окне TTL при той же валюте — кэш не совпадёт и будет создан новый инвойс.
 *
 * TTL 30 мин по requestedAt. Статус bill НЕ проверяется.
 * Lookup только по ok:true. Фильтр по gatewayId отсекает legacy-записи без поля.
 */

import * as requestLogRepo from '../../repos/requestLog.repo'
import * as loggerLib from '../logger.lib'
import type { RequestLogRow } from '../../tables/requestLog.table'

const BILL_IDEMPOTENCY_TTL_MS = 30 * 60 * 1000
const LOG_MODULE = 'lib/gateway/idempotentBillCache'

export type CachedBillHit = {
  paymentUrl: string
  requestId: string
  requestedAt: number
}

/**
 * Извлекает paymentUrl из rawResponseBody строки request_log.
 * Порядок: rawResponseBody.paymentUrl → rawResponseBody.data.paymentUrl → ''.
 * Marker-объекты (__truncated / __nonJson / __noBody) или не-объект → ''.
 */
function extractPaymentUrlFromRow(row: RequestLogRow): string {
  const raw: unknown = row.rawResponseBody
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return ''
  const obj = raw as Record<string, unknown>
  if ('__truncated' in obj || '__nonJson' in obj || '__noBody' in obj) return ''

  if (typeof obj.paymentUrl === 'string' && obj.paymentUrl) return obj.paymentUrl

  const data = obj.data
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const dataObj = data as Record<string, unknown>
    if (typeof dataObj.paymentUrl === 'string' && dataObj.paymentUrl) return dataObj.paymentUrl
  }

  return ''
}

/**
 * Проверяет соответствие amount/currency из argsRedacted строки ожидаемым значениям.
 * ОБЯЗАТЕЛЬНЫЙ type-guard: если argsRedacted не объект или содержит marker-ключи — лог + false.
 */
function matchesAmountCurrency(
  ctx: app.Ctx,
  row: RequestLogRow,
  expected: { amount?: number; currency?: string },
  opts: { checkAmount: boolean; checkCurrency: boolean }
): boolean {
  const args: unknown = row.argsRedacted
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    void loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] args_truncated_skip`,
      payload: { reason: 'not_object', requestId: row.requestId }
    })
    return false
  }
  const obj = args as Record<string, unknown>
  if ('__truncated' in obj || '__nonJson' in obj || '__noBody' in obj) {
    void loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] args_truncated_skip`,
      payload: { reason: 'marker_key', requestId: row.requestId }
    })
    return false
  }

  if (opts.checkAmount && expected.amount !== undefined) {
    if (Number(obj.amount) !== expected.amount) return false
  }

  if (opts.checkCurrency && expected.currency !== undefined) {
    if (String(obj.currency).toUpperCase() !== String(expected.currency).toUpperCase()) return false
  }

  return true
}

/**
 * Ищет последний ok-результат createBill / createInvoice по orderNumber в пределах TTL.
 * Возвращает CachedBillHit с paymentUrl, requestId и requestedAt первой подходящей записи,
 * либо null при промахе.
 */
export async function findCachedBill(
  ctx: app.Ctx,
  params: {
    op: 'createBill' | 'createInvoice'
    gatewayId: 'lifepay' | 'lavatop'
    orderNumber: string
    expectedAmount?: number
    expectedCurrency?: string
  }
): Promise<CachedBillHit | null> {
  const { op, gatewayId, orderNumber, expectedAmount, expectedCurrency } = params
  const sinceRequestedAt = Date.now() - BILL_IDEMPOTENCY_TTL_MS

  const rows = await requestLogRepo.findLatestOkForIdempotency(ctx, {
    op,
    gatewayId,
    orderNumber,
    sinceRequestedAt
  })

  const checkAmount = gatewayId === 'lifepay' || gatewayId === 'lavatop'
  const checkCurrency = gatewayId === 'lavatop'

  for (const row of rows) {
    const matches = matchesAmountCurrency(
      ctx,
      row,
      { amount: expectedAmount, currency: expectedCurrency },
      { checkAmount, checkCurrency }
    )
    if (!matches) {
      await loggerLib.writeServerLog(ctx, {
        severity: 7,
        message: `[${LOG_MODULE}] findCachedBill: candidate_skip`,
        payload: { reason: 'match_failed', requestId: row.requestId ?? '', op, gatewayId }
      })
      continue
    }
    const url = extractPaymentUrlFromRow(row)
    if (!url) {
      await loggerLib.writeServerLog(ctx, {
        severity: 7,
        message: `[${LOG_MODULE}] findCachedBill: candidate_skip`,
        payload: { reason: 'no_payment_url', requestId: row.requestId ?? '', op, gatewayId }
      })
      continue
    }
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] cache_hit`,
      payload: {
        op,
        gatewayId,
        orderNumber,
        requestedAt: row.requestedAt,
        requestId: row.requestId
      }
    })
    return { paymentUrl: url, requestId: row.requestId ?? '', requestedAt: row.requestedAt }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] cache_miss`,
    payload: { op, gatewayId, orderNumber }
  })
  return null
}
