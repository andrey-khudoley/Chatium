/**
 * Резолвер данных GC-заказа для deal-потока виджета LifePay.
 *
 * Принимает raw dealId, дважды обращается к GC-гейтвею (getDealFields →
 * getUserFields), агрегирует amount/currency/email/title и возвращает
 * типизированный результат. Содержит только серверную логику; не содержит
 * Heap-операций напрямую.
 */

import * as loggerLib from '../logger.lib'
import { invokeByGateway } from './invokeDispatcher'
import { recordRequestLog } from './recordRequestLog'
import { convertToRub, type PaymentCurrency } from '../rates/currencyConverter'

const LOG_MODULE = 'lib/gateway/gcDealResolver'

// Имена полей GC-заказа вынесены в константы для лёгкой правки при
// изменении контракта GC API.
const GC_DEAL_FIELD_COST = 'cost'
const GC_DEAL_FIELD_CURRENCY = 'currency'
const GC_DEAL_FIELD_USER_ID = 'user_id'
const GC_DEAL_FIELD_TITLE = 'title'
const GC_DEAL_FIELD_NUMBER = 'number'
const GC_DEAL_FIELD_IS_PAYED = 'is_payed'
const GC_DEAL_FIELD_PAYED_VALUE = 'payed_value'
const GC_DEAL_FIELD_USER_PAYED_MONEY_VALUE = 'user_payed_money_value'
// status — вспомогательный признак; список оплаченных статусов расширяем,
// основной признак — is_payed === true.
const GC_DEAL_FIELD_STATUS = 'status'
// positions — позиции заказа (массив объектов; для сверки допуска берём offer_id).
const GC_DEAL_FIELD_POSITIONS = 'positions'

// Имена полей GC-профиля пользователя.
const GC_USER_FIELD_EMAIL = 'email'

export type GcDealErrorCode =
  | 'WIDGET_GC_DEAL_ID_INVALID'
  | 'WIDGET_GC_DEAL_NOT_FOUND'
  | 'WIDGET_GC_ALREADY_PAID'
  | 'WIDGET_GC_EMAIL_MISSING'
  | 'WIDGET_GC_CURRENCY_UNSUPPORTED'
  | 'WIDGET_GC_GATEWAY_ERROR'

export type GcDealResolveResult =
  | {
      ok: true
      amount: number
      currency: string
      email: string
      title: string
      userId: string
      /** Позиции заказа из getDealFields (для серверной проверки допуска по id). */
      positions: { id: string }[]
      /** GC поле number (номер заказа). Пустая строка при отсутствии в ответе GC. */
      dealNumber: string
    }
  | { ok: false; code: GcDealErrorCode }

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseFiniteNumber(value: unknown): number {
  return typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN
}

function parseNonNegativeMoney(value: unknown): number {
  const n = parseFiniteNumber(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateGcDealPayableAmount(dealObj: Record<string, unknown>):
  | { ok: true; cost: number; alreadyPaid: number; amount: number }
  | {
      ok: false
      reason: 'invalid_cost' | 'already_paid'
      costRaw: unknown
      cost?: number
      alreadyPaid: number
    } {
  const costRaw = dealObj[GC_DEAL_FIELD_COST]
  const cost = parseFiniteNumber(costRaw)
  if (!Number.isFinite(cost) || cost <= 0) {
    return { ok: false, reason: 'invalid_cost', costRaw, alreadyPaid: 0 }
  }

  const alreadyPaid = roundMoney(
    Math.max(
      parseNonNegativeMoney(dealObj[GC_DEAL_FIELD_USER_PAYED_MONEY_VALUE]),
      parseNonNegativeMoney(dealObj[GC_DEAL_FIELD_PAYED_VALUE])
    )
  )
  const amount = roundMoney(cost - alreadyPaid)
  if (amount <= 0) {
    return { ok: false, reason: 'already_paid', costRaw, cost: roundMoney(cost), alreadyPaid }
  }

  return { ok: true, cost: roundMoney(cost), alreadyPaid, amount }
}

/**
 * Извлекает объект заказа/профиля из двойной обёртки GC-ответа.
 *
 * Реальная структура от `invokeByGateway('gc', ...)`:
 *   responseBody.data (gateway v1SuccessResponse) → это GC JSON
 *   responseBody.data.data (GC API) → это сам объект заказа
 *
 * Терпимо к ситуации, когда `responseBody.data` уже содержит поля
 * объекта напрямую (без вложенного `data`).
 */
function extractGcDataObject(
  responseBody: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!responseBody) return null
  const dataField = responseBody.data
  if (isObject(dataField)) {
    // Основной путь: responseBody.data.data — объект заказа/профиля.
    const inner = (dataField as { data?: unknown }).data
    if (isObject(inner)) return inner
    // Терпимость: responseBody.data само является объектом с нужными полями.
    if (Object.keys(dataField).length > 0) return dataField as Record<string, unknown>
  }
  return null
}

/**
 * Резолвит данные GC-заказа по dealId для deal-потока виджета LifePay.
 *
 * @param ctx — платформенный контекст
 * @param dealIdRaw — raw значение id заказа (string или number из тела запроса)
 * @param correlationId — опциональный correlationId для связки с request_log
 */
export async function resolveGcDeal(
  ctx: app.Ctx,
  dealIdRaw: string | number,
  correlationId?: string
): Promise<GcDealResolveResult> {
  // 1. Нормализация и валидация dealId
  const dealIdNum = Number(String(dealIdRaw).trim())
  if (!Number.isInteger(dealIdNum) || dealIdNum <= 0 || dealIdNum > Number.MAX_SAFE_INTEGER) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolve_fail: invalid_deal_id`,
      payload: { dealId: dealIdRaw, code: 'WIDGET_GC_DEAL_ID_INVALID' }
    })
    return { ok: false, code: 'WIDGET_GC_DEAL_ID_INVALID' }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] resolveGcDeal entry`,
    payload: { dealId: dealIdNum }
  })

  // 2. Запрос полей заказа из GC (dealId числом — s.number() в каталоге GC)
  const dealRes = await invokeByGateway(
    ctx,
    'gc',
    'getDealFields',
    { dealId: dealIdNum },
    { httpMethod: 'GET' }
  )

  try {
    await recordRequestLog(ctx, {
      gatewayId: 'gc',
      op: 'getDealFields',
      args: { dealId: dealIdNum },
      invoke: dealRes,
      correlationId
    })
  } catch (e) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] record_log_failed`,
        payload: { op: 'getDealFields', dealId: dealIdNum, error: String(e) }
      })
    } catch {
      // глотаем
    }
  }

  if (!dealRes.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolve_fail: gateway_error_deal`,
      payload: {
        dealId: dealIdNum,
        code: 'WIDGET_GC_GATEWAY_ERROR',
        httpStatus: dealRes.httpStatus,
        proxyError: dealRes.proxyError,
        requestId: dealRes.requestId
      }
    })
    return { ok: false, code: 'WIDGET_GC_GATEWAY_ERROR' }
  }

  // 3. Извлечение объекта заказа из двойной обёртки
  const dealObj = extractGcDataObject(dealRes.responseBody)
  if (!dealObj) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolve_fail: deal_not_found`,
      payload: { dealId: dealIdNum, code: 'WIDGET_GC_DEAL_NOT_FOUND' }
    })
    return { ok: false, code: 'WIDGET_GC_DEAL_NOT_FOUND' }
  }

  // 4. Признак оплаченности: нормализуем legacy-варианты GC (true / 1 / '1' / 'true').
  //    Список оплаченных статусов (status-поле) расширяем — при необходимости
  //    добавить проверки на dealObj[GC_DEAL_FIELD_STATUS].
  const isPayedRaw = dealObj[GC_DEAL_FIELD_IS_PAYED]
  const isPayed =
    isPayedRaw === true || isPayedRaw === 1 || isPayedRaw === '1' || isPayedRaw === 'true'
  if (isPayed) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolve_fail: already_paid`,
      payload: {
        dealId: dealIdNum,
        code: 'WIDGET_GC_ALREADY_PAID',
        status: dealObj[GC_DEAL_FIELD_STATUS]
      }
    })
    return { ok: false, code: 'WIDGET_GC_ALREADY_PAID' }
  }

  // 5. Валюта: default 'RUB' при пустом; LifePay createBill работает только с RUB
  const currencyRaw = dealObj[GC_DEAL_FIELD_CURRENCY]
  const currency =
    typeof currencyRaw === 'string' && currencyRaw.trim() ? currencyRaw.trim().toUpperCase() : 'RUB'
  if (currency !== 'RUB') {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolve_fail: currency_unsupported`,
      payload: { dealId: dealIdNum, code: 'WIDGET_GC_CURRENCY_UNSUPPORTED', currency }
    })
    return { ok: false, code: 'WIDGET_GC_CURRENCY_UNSUPPORTED' }
  }

  // 6. Сумма к оплате: остаток по заказу, а не полный cost.
  const amountCalc = calculateGcDealPayableAmount(dealObj)
  if (!amountCalc.ok && amountCalc.reason === 'already_paid') {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolve_fail: already_paid`,
      payload: {
        dealId: dealIdNum,
        code: 'WIDGET_GC_ALREADY_PAID',
        status: dealObj[GC_DEAL_FIELD_STATUS],
        cost: amountCalc.cost,
        alreadyPaid: amountCalc.alreadyPaid
      }
    })
    return { ok: false, code: 'WIDGET_GC_ALREADY_PAID' }
  }
  if (!amountCalc.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolve_fail: invalid_amount`,
      payload: { dealId: dealIdNum, code: 'WIDGET_GC_GATEWAY_ERROR', costRaw: amountCalc.costRaw }
    })
    return { ok: false, code: 'WIDGET_GC_GATEWAY_ERROR' }
  }
  const amount = amountCalc.amount

  // 7. user_id — числом (userId передаётся в getUserFields числом)
  const userIdRaw = dealObj[GC_DEAL_FIELD_USER_ID]
  const dealUserId =
    typeof userIdRaw === 'number'
      ? userIdRaw
      : typeof userIdRaw === 'string'
        ? Number(userIdRaw.trim())
        : NaN
  if (!Number.isInteger(dealUserId) || dealUserId <= 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolve_fail: user_id_missing`,
      payload: { dealId: dealIdNum, code: 'WIDGET_GC_EMAIL_MISSING' }
    })
    return { ok: false, code: 'WIDGET_GC_EMAIL_MISSING' }
  }

  // 8. Запрос профиля пользователя из GC (userId числом — s.number() в каталоге GC)
  const userRes = await invokeByGateway(
    ctx,
    'gc',
    'getUserFields',
    { userId: dealUserId },
    { httpMethod: 'GET' }
  )

  try {
    await recordRequestLog(ctx, {
      gatewayId: 'gc',
      op: 'getUserFields',
      args: { userId: dealUserId },
      invoke: userRes,
      correlationId
    })
  } catch (e) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] record_log_failed`,
        payload: { op: 'getUserFields', dealId: dealIdNum, error: String(e) }
      })
    } catch {
      // глотаем
    }
  }

  if (!userRes.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolve_fail: gateway_error_user`,
      payload: {
        dealId: dealIdNum,
        code: 'WIDGET_GC_GATEWAY_ERROR',
        httpStatus: userRes.httpStatus,
        proxyError: userRes.proxyError,
        requestId: userRes.requestId
      }
    })
    return { ok: false, code: 'WIDGET_GC_GATEWAY_ERROR' }
  }

  // 9. Извлечение профиля и email
  const userObj = extractGcDataObject(userRes.responseBody)
  if (!userObj) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolve_fail: user_not_found`,
      payload: { dealId: dealIdNum, code: 'WIDGET_GC_EMAIL_MISSING' }
    })
    return { ok: false, code: 'WIDGET_GC_EMAIL_MISSING' }
  }

  const emailRaw = userObj[GC_USER_FIELD_EMAIL]
  const email = typeof emailRaw === 'string' ? emailRaw.trim() : ''
  if (!email) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolve_fail: email_missing`,
      payload: { dealId: dealIdNum, code: 'WIDGET_GC_EMAIL_MISSING' }
    })
    return { ok: false, code: 'WIDGET_GC_EMAIL_MISSING' }
  }

  const titleRaw = dealObj[GC_DEAL_FIELD_TITLE]
  const title = typeof titleRaw === 'string' ? titleRaw.trim() : ''

  // Номер заказа (GC поле number): строку trimим, число → строку, остальное → ''.
  const numberRaw = dealObj[GC_DEAL_FIELD_NUMBER]
  const dealNumber =
    typeof numberRaw === 'string'
      ? numberRaw.trim()
      : typeof numberRaw === 'number'
        ? String(numberRaw)
        : ''

  // 10. Извлечение позиций заказа из поля positions (для сверки допуска — только по id).
  //     Каждый объект-элемент включаем целиком (даже с пустым offer_id): в whitelist
  //     позиция без распознанного id не совпадёт ни с одним allowed[].id и корректно
  //     заблокирует показ (fail-closed), а не «протечёт» мимо проверки.
  const positionsRaw = dealObj[GC_DEAL_FIELD_POSITIONS]
  const positions: { id: string }[] = []
  if (Array.isArray(positionsRaw)) {
    for (const pos of positionsRaw) {
      if (typeof pos === 'object' && pos !== null) {
        const p = pos as Record<string, unknown>
        // offer_id (число или строка, в т.ч. 0) → строка через явное String().
        // Сравнение != null (а не truthy), чтобы offer_id=0 давал id='0', а не пустую.
        const offerId = p.offer_id != null ? String(p.offer_id).trim() : ''
        positions.push({ id: offerId })
      }
    }
  }

  // 11. Успех — email не логируем (PII)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] resolveGcDeal success`,
    payload: {
      dealId: dealIdNum,
      userId: String(dealUserId),
      amount,
      cost: amountCalc.cost,
      alreadyPaid: amountCalc.alreadyPaid,
      currency,
      hasEmail: true,
      positionsCount: positions.length
    }
  })

  return {
    ok: true,
    amount,
    currency,
    email,
    title,
    userId: String(dealUserId),
    positions,
    dealNumber
  }
}

export type GcDealAmountResult =
  | { ok: true; amountRub: number; hasTopUpPayment: boolean }
  | { ok: false }

/**
 * Лёгкий резолвер ТОЛЬКО суммы заказа для config-эндпоинта (доступность виджета).
 * Один вызов getDealFields. Не запрашивает email и не проверяет оффер-допуск —
 * в отличие от resolveGcDeal (тот для intent-потока). Уже оплаченный заказ → ok:false
 * (виджет скрывается). Конвертирует сумму в рубли через convertToRub (identity для RUB,
 * ручной/ЦБ для USD/EUR); при недоступности курса → ok:false (fail-closed).
 *
 * @param ctx — платформенный контекст
 * @param dealIdRaw — raw значение id заказа (string или number из тела запроса)
 */
export async function resolveGcDealAmount(
  ctx: app.Ctx,
  dealIdRaw: string | number
): Promise<GcDealAmountResult> {
  // Нормализация и валидация dealId
  const dealIdNum = Number(String(dealIdRaw).trim())
  if (!Number.isInteger(dealIdNum) || dealIdNum <= 0 || dealIdNum > Number.MAX_SAFE_INTEGER) {
    return { ok: false }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] resolveGcDealAmount: entry`,
    payload: { dealId: dealIdNum, dealIdRaw }
  })

  const dealRes = await invokeByGateway(
    ctx,
    'gc',
    'getDealFields',
    { dealId: dealIdNum },
    { httpMethod: 'GET' }
  )

  if (!dealRes.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolveGcDealAmount: gateway_error`,
      payload: { dealId: dealIdNum, httpStatus: dealRes.httpStatus, requestId: dealRes.requestId }
    })
    return { ok: false }
  }

  const dealObj = extractGcDataObject(dealRes.responseBody)
  if (!dealObj) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolveGcDealAmount: deal_not_found`,
      payload: { dealId: dealIdNum }
    })
    return { ok: false }
  }

  // Признак оплаченности (та же нормализация что в resolveGcDeal)
  const isPayedRaw = dealObj[GC_DEAL_FIELD_IS_PAYED]
  const isPayed =
    isPayedRaw === true || isPayedRaw === 1 || isPayedRaw === '1' || isPayedRaw === 'true'
  if (isPayed) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] resolveGcDealAmount: already_paid`,
      payload: { dealId: dealIdNum }
    })
    return { ok: false }
  }

  // Валюта: default 'RUB' при пустом (та же нормализация что в resolveGcDeal)
  const currencyRaw = dealObj[GC_DEAL_FIELD_CURRENCY]
  const currency =
    typeof currencyRaw === 'string' && currencyRaw.trim() ? currencyRaw.trim().toUpperCase() : 'RUB'

  // Сумма к оплате: остаток по заказу, а не полный cost.
  const amountCalc = calculateGcDealPayableAmount(dealObj)
  if (!amountCalc.ok && amountCalc.reason === 'already_paid') {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] resolveGcDealAmount: already_paid`,
      payload: { dealId: dealIdNum, cost: amountCalc.cost, alreadyPaid: amountCalc.alreadyPaid }
    })
    return { ok: false }
  }
  if (!amountCalc.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolveGcDealAmount: invalid_amount`,
      payload: { dealId: dealIdNum, costRaw: amountCalc.costRaw }
    })
    return { ok: false }
  }
  const amount = amountCalc.amount
  const hasTopUpPayment = amountCalc.alreadyPaid > 0

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] resolveGcDealAmount: fields_extracted`,
    payload: {
      dealId: dealIdNum,
      currency,
      cost: amountCalc.cost,
      alreadyPaid: amountCalc.alreadyPaid,
      amount
    }
  })

  // Конвертация в рубли
  let amountRub: number
  if (currency === 'RUB') {
    amountRub = amount
  } else if (currency === 'USD' || currency === 'EUR') {
    const conv = await convertToRub(ctx, { amount, currency: currency as PaymentCurrency })
    if (!conv.ok) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_MODULE}] resolveGcDealAmount: rate_unavailable`,
        payload: { dealId: dealIdNum, currency }
      })
      return { ok: false }
    }
    amountRub = conv.amountRub
  } else {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] resolveGcDealAmount: unknown_currency`,
      payload: { dealId: dealIdNum, currency }
    })
    return { ok: false }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] resolveGcDealAmount: success`,
    payload: {
      dealId: dealIdNum,
      currency,
      cost: amountCalc.cost,
      alreadyPaid: amountCalc.alreadyPaid,
      amount,
      amountRub,
      hasTopUpPayment
    }
  })

  return { ok: true, amountRub, hasTopUpPayment }
}
