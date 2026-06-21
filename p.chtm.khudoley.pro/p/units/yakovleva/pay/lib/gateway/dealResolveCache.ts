/**
 * Кэш результатов резолвинга GC-заказа (gcDealNumber + email + amount) на основе
 * ранее сохранённых записей request_log.createBill.
 *
 * Модуль находится в lib/ (а не repos/), потому что содержит кэш-логику с валидацией
 * argsRedacted: это не чистый CRUD поверх одной таблицы, а агрегирующий слой с
 * бизнес-правилами (marker-guard, type-check email/amount, fallback-семантика).
 */

import * as requestLogRepo from '../../repos/requestLog.repo'
import * as loggerLib from '../logger.lib'

const LOG_MODULE = 'lib/gateway/dealResolveCache'

export type DealResolveCacheHit = {
  ok: true
  dealNumber: string
  email: string
  amount: string
}

export type DealResolveCacheResult = DealResolveCacheHit | { ok: false }

/**
 * Ищет последнюю createBill-запись по correlationId и извлекает из неё
 * gcDealNumber, email и amount для downstream-вызова createDeal.
 *
 * Возвращает `{ ok: false }` в случаях:
 *   - нет записи createBill по correlationId;
 *   - gcDealNumber не сохранён (старые записи без поля → fallback в вызывающем коде);
 *   - argsRedacted — marker-объект (__truncated / __nonJson / __noBody) или не-объект;
 *   - email невалиден (не строка или нет '@');
 *   - amount невалиден (не строка/число).
 */
export async function lookupDealResolve(
  ctx: app.Ctx,
  correlationId: string
): Promise<DealResolveCacheResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] lookupDealResolve entry`,
    payload: { correlationId }
  })

  const row = await requestLogRepo.findLatestCreateBillByCorrelationId(ctx, correlationId)
  if (!row) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] cache_miss`,
      payload: { correlationId, reason: 'no_createbill_record' }
    })
    return { ok: false }
  }

  // gcDealNumber — опциональная колонка; старые записи без поля → fallback
  const gcDealNumber = row.gcDealNumber
  if (!gcDealNumber) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] cache_miss`,
      payload: { correlationId, reason: 'gcDealNumber_missing' }
    })
    return { ok: false }
  }

  // Проверка argsRedacted: должен быть объектом без marker-ключей
  const args: unknown = row.argsRedacted
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] cache_miss`,
      payload: { correlationId, reason: 'args_not_object' }
    })
    return { ok: false }
  }
  const argsObj = args as Record<string, unknown>
  if ('__truncated' in argsObj || '__nonJson' in argsObj || '__noBody' in argsObj) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] cache_miss`,
      payload: { correlationId, reason: 'args_marker' }
    })
    return { ok: false }
  }

  // Валидация email — не логируем значение (PII)
  const emailRaw = argsObj.customerEmail
  if (typeof emailRaw !== 'string' || !emailRaw.includes('@')) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] cache_miss`,
      payload: { correlationId, reason: 'email_invalid' }
    })
    return { ok: false }
  }
  const email = emailRaw

  // Валидация amount
  const amountRaw = argsObj.amount
  if (typeof amountRaw !== 'string' && typeof amountRaw !== 'number') {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] cache_miss`,
      payload: { correlationId, reason: 'amount_invalid' }
    })
    return { ok: false }
  }
  const amount = String(amountRaw)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] cache_hit`,
    payload: { correlationId, dealNumber: gcDealNumber }
  })

  return { ok: true, dealNumber: gcDealNumber, email, amount }
}
