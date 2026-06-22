/**
 * Unit-тесты GetCourse: чистые функции без сети и Heap.
 */

import { parseGcDealsResponse } from '../gateway/parseGcDeals.lib'
import { normalizeOffer, extractOffers } from '../offers/offers.lib'
import { mapGcStatus, isPayedTruthy } from '../orders/orderStatus.lib'
import {
  extractDealFields,
  computeWebhookId,
  parseDatetimeToUnixMs
} from '../webhook/processWebhook.lib'
import { toMoney, fromMoney } from '../orders/money.lib'
import { extractCheckoutPayload } from '../checkout/processCheckoutSubmitted.lib'
import { type TemplateUnitTestResult, tryPush } from './templateUnitSuiteHelpers'

// ---------------------------------------------------------------------------
// Фикстуры
// ---------------------------------------------------------------------------

export const GC_DEAL_RESPONSE_OK = {
  success: true,
  result: {
    success: true,
    payment_link: 'https://school.getcourse.ru/pl/pay/123',
    deal_id: '123',
    deal_number: 'DEAL-001',
    user_id: 'user-42'
  }
}

export const GC_DEAL_RESPONSE_ERROR = {
  success: true,
  result: { error: true, error_message: 'Сделка не найдена' }
}

export const GC_DEAL_RESPONSE_TOP_FAIL = {
  success: false
}

export const GC_DEAL_RESPONSE_INNER_FAIL = {
  success: true,
  result: { success: false, error_message: 'Оффер не найден' }
}

export const GC_DEAL_RESPONSE_TOP_ONLY = {
  success: true,
  result: null
}

export const OFFER_RAW_FULL = {
  id: '42',
  title: 'Курс Python',
  price: 9900,
  final_price: 7900,
  currency: 'RUB',
  status: 'active'
}

export const OFFER_RAW_ALT_FIELDS = {
  offer_id: '10',
  name: 'Курс Go',
  price: 5000,
  currency: 'RUB',
  status: 'inactive'
}

export const WEBHOOK_BODY_ROOT = {
  id: '789',
  number: 'DEAL-050',
  status: 'payed',
  is_payed: true,
  status_updated_at: '2026-01-17 03:59:08'
}

export const WEBHOOK_BODY_NESTED = {
  object: {
    deal_id: '789',
    deal_number: 'DEAL-050',
    status: 'payed',
    is_payed: '1',
    status_updated_at: '2026-01-17 03:59:08'
  }
}

// ---------------------------------------------------------------------------
// parseGcDealsResponse
// ---------------------------------------------------------------------------

function runParseGcDealsChecks(results: TemplateUnitTestResult[]): void {
  tryPush(results, 'gc_parse_ok_success', 'parseGcDealsResponse: успешный ответ', () => {
    const r = parseGcDealsResponse(GC_DEAL_RESPONSE_OK)
    return (
      r.ok === true &&
      'paymentLink' in r &&
      r.paymentLink === 'https://school.getcourse.ru/pl/pay/123'
    )
  })

  tryPush(
    results,
    'gc_parse_ok_fields',
    'parseGcDealsResponse: извлечение deal_id/number/user_id',
    () => {
      const r = parseGcDealsResponse(GC_DEAL_RESPONSE_OK)
      if (!r.ok) return false
      return r.dealId === '123' && r.dealNumber === 'DEAL-001' && r.userId === 'user-42'
    }
  )

  tryPush(results, 'gc_parse_result_error', 'parseGcDealsResponse: result.error', () => {
    const r = parseGcDealsResponse(GC_DEAL_RESPONSE_ERROR)
    return r.ok === false && 'errorMessage' in r && r.errorMessage === 'Сделка не найдена'
  })

  tryPush(results, 'gc_parse_top_fail', 'parseGcDealsResponse: top success=false', () => {
    const r = parseGcDealsResponse(GC_DEAL_RESPONSE_TOP_FAIL)
    return r.ok === false
  })

  tryPush(results, 'gc_parse_inner_fail', 'parseGcDealsResponse: result.success=false', () => {
    const r = parseGcDealsResponse(GC_DEAL_RESPONSE_INNER_FAIL)
    return r.ok === false && 'errorMessage' in r && r.errorMessage === 'Оффер не найден'
  })

  tryPush(results, 'gc_parse_top_only', 'parseGcDealsResponse: top_only (result=null)', () => {
    const r = parseGcDealsResponse(GC_DEAL_RESPONSE_TOP_ONLY)
    return r.ok === false && 'detail' in r && r.detail === 'top_only'
  })

  tryPush(results, 'gc_parse_invalid_body', 'parseGcDealsResponse: невалидное тело', () => {
    const r = parseGcDealsResponse(null)
    return r.ok === false
  })

  tryPush(results, 'gc_parse_string_true', 'parseGcDealsResponse: success="true" строкой', () => {
    const r = parseGcDealsResponse({
      success: 'true',
      result: { success: 'true', payment_link: 'https://x' }
    })
    return r.ok === true
  })
}

// ---------------------------------------------------------------------------
// normalizeOffer / extractOffers
// ---------------------------------------------------------------------------

function runOffersChecks(results: TemplateUnitTestResult[]): void {
  tryPush(results, 'offer_normalize_full', 'normalizeOffer: полные поля', () => {
    const o = normalizeOffer(OFFER_RAW_FULL)
    return (
      o !== null &&
      o.id === '42' &&
      o.title === 'Курс Python' &&
      o.price === 9900 &&
      o.finalPrice === 7900 &&
      o.currency === 'RUB'
    )
  })

  tryPush(results, 'offer_normalize_alt', 'normalizeOffer: offer_id / name', () => {
    const o = normalizeOffer(OFFER_RAW_ALT_FIELDS)
    return o !== null && o.id === '10' && o.title === 'Курс Go' && o.finalPrice === 5000
  })

  tryPush(results, 'offer_normalize_empty', 'normalizeOffer: пустой объект → null', () => {
    const o = normalizeOffer({})
    return o === null
  })

  tryPush(results, 'offers_extract_double_wrap', 'extractOffers: двойная обёртка data.data', () => {
    const raw = { data: [OFFER_RAW_FULL, OFFER_RAW_ALT_FIELDS] }
    const offers = extractOffers(raw)
    const first = offers[0]
    return offers.length === 2 && first?.id === '42'
  })

  tryPush(results, 'offers_extract_empty', 'extractOffers: пустой/битый список', () => {
    const offers = extractOffers({ data: [] })
    return Array.isArray(offers) && offers.length === 0
  })

  tryPush(results, 'offers_extract_null', 'extractOffers: null', () => {
    const offers = extractOffers(null)
    return Array.isArray(offers) && offers.length === 0
  })
}

// ---------------------------------------------------------------------------
// mapGcStatus / isPayedTruthy
// ---------------------------------------------------------------------------

function runOrderStatusChecks(results: TemplateUnitTestResult[]): void {
  tryPush(results, 'status_isPayed_true', 'isPayedTruthy: true', () => isPayedTruthy(true))
  tryPush(results, 'status_isPayed_1', 'isPayedTruthy: 1', () => isPayedTruthy(1))
  tryPush(results, 'status_isPayed_str1', 'isPayedTruthy: "1"', () => isPayedTruthy('1'))
  tryPush(results, 'status_isPayed_strTrue', 'isPayedTruthy: "true"', () => isPayedTruthy('true'))
  tryPush(
    results,
    'status_isPayed_false',
    'isPayedTruthy: false → false',
    () => !isPayedTruthy(false)
  )
  tryPush(results, 'status_isPayed_zero', 'isPayedTruthy: 0 → false', () => !isPayedTruthy(0))
  tryPush(results, 'status_isPayed_str0', 'isPayedTruthy: "0" → false', () => !isPayedTruthy('0'))

  tryPush(
    results,
    'status_map_new',
    'mapGcStatus: new → new',
    () => mapGcStatus('new', false, 'payed') === 'new'
  )
  tryPush(
    results,
    'status_map_in_work',
    'mapGcStatus: in_work → pending',
    () => mapGcStatus('in_work', false, 'payed') === 'pending'
  )
  tryPush(
    results,
    'status_map_not_confirmed',
    'mapGcStatus: not_confirmed → pending',
    () => mapGcStatus('not_confirmed', false, 'payed') === 'pending'
  )
  tryPush(
    results,
    'status_map_payment_waiting',
    'mapGcStatus: payment_waiting → pending',
    () => mapGcStatus('payment_waiting', false, 'payed') === 'pending'
  )
  tryPush(
    results,
    'status_map_part_payed',
    'mapGcStatus: part_payed → part_paid',
    () => mapGcStatus('part_payed', false, 'payed') === 'part_paid'
  )
  tryPush(
    results,
    'status_map_payed',
    'mapGcStatus: payed → paid',
    () => mapGcStatus('payed', false, 'payed') === 'paid'
  )
  tryPush(
    results,
    'status_map_isPayed_true',
    'mapGcStatus: isPayed=true → paid',
    () => mapGcStatus('in_work', true, 'payed') === 'paid'
  )
  tryPush(
    results,
    'status_map_cancelled',
    'mapGcStatus: cancelled → cancelled',
    () => mapGcStatus('cancelled', false, 'payed') === 'cancelled'
  )
  tryPush(
    results,
    'status_map_waiting_for_return',
    'mapGcStatus: waiting_for_return → cancelled',
    () => mapGcStatus('waiting_for_return', false, 'payed') === 'cancelled'
  )
  tryPush(
    results,
    'status_map_false_str',
    'mapGcStatus: "false" → cancelled',
    () => mapGcStatus('false', false, 'payed') === 'cancelled'
  )
  tryPush(
    results,
    'status_map_paid_override',
    'mapGcStatus: gc_paid_status переопределение',
    () => mapGcStatus('custom_paid', false, 'custom_paid') === 'paid'
  )
}

// ---------------------------------------------------------------------------
// extractDealFields / computeWebhookId / parseDatetimeToUnixMs
// ---------------------------------------------------------------------------

function runWebhookChecks(results: TemplateUnitTestResult[]): void {
  tryPush(results, 'webhook_extract_root', 'extractDealFields: поля в корне', () => {
    const f = extractDealFields(WEBHOOK_BODY_ROOT)
    return f.dealId === '789' && f.dealNumber === 'DEAL-050' && f.gcStatus === 'payed'
  })

  tryPush(results, 'webhook_extract_nested', 'extractDealFields: поля в object', () => {
    const f = extractDealFields(WEBHOOK_BODY_NESTED)
    return f.dealId === '789' && f.dealNumber === 'DEAL-050'
  })

  tryPush(results, 'webhook_extract_null', 'extractDealFields: null тело', () => {
    const f = extractDealFields(null)
    return f.dealId === undefined && f.gcStatus === undefined
  })

  tryPush(results, 'webhook_computeId', 'computeWebhookId: формат', () => {
    const id = computeWebhookId('789', 'payed', '2026-01-17 03:59:08')
    return id === '789:payed:2026-01-17 03:59:08'
  })

  tryPush(results, 'webhook_computeId_undef', 'computeWebhookId: undefined значения', () => {
    const id = computeWebhookId(undefined, undefined, undefined)
    return id === '::'
  })

  tryPush(results, 'webhook_parseDatetime_valid', 'parseDatetimeToUnixMs: валидная дата', () => {
    const ms = parseDatetimeToUnixMs('2026-01-17 03:59:08')
    return typeof ms === 'number' && ms > 0
  })

  tryPush(results, 'webhook_parseDatetime_nan', 'parseDatetimeToUnixMs: невалидная → 0', () => {
    const ms = parseDatetimeToUnixMs('not-a-date')
    return ms === 0
  })

  tryPush(results, 'webhook_parseDatetime_undef', 'parseDatetimeToUnixMs: undefined → 0', () => {
    const ms = parseDatetimeToUnixMs(undefined)
    return ms === 0
  })
}

// ---------------------------------------------------------------------------
// toMoney / fromMoney
// ---------------------------------------------------------------------------

function runMoneyChecks(results: TemplateUnitTestResult[]): void {
  tryPush(results, 'money_toMoney_rub', 'toMoney: RUB', () => {
    const m = toMoney(100, 'RUB')
    const { amount, currency } = fromMoney(m)
    return amount === 100 && currency === 'RUB'
  })

  tryPush(results, 'money_toMoney_usd', 'toMoney: USD', () => {
    const m = toMoney(50, 'usd')
    const { amount, currency } = fromMoney(m)
    return amount === 50 && currency === 'USD'
  })

  tryPush(results, 'money_toMoney_empty_currency', 'toMoney: пустая валюта → RUB', () => {
    const m = toMoney(200, '')
    const { currency } = fromMoney(m)
    return currency === 'RUB'
  })

  tryPush(results, 'money_toMoney_invalid_currency', 'toMoney: невалидная валюта → ошибка', () => {
    try {
      toMoney(100, 'INVALID_XYZ_CURRENCY')
      return false
    } catch {
      return true
    }
  })

  tryPush(results, 'money_fromMoney_fields', 'fromMoney: возвращает amount и currency', () => {
    const m = toMoney(9900, 'RUB')
    const result = fromMoney(m)
    return typeof result.amount === 'number' && typeof result.currency === 'string'
  })
}

// ---------------------------------------------------------------------------
// extractCheckoutPayload
// ---------------------------------------------------------------------------

function runCheckoutPayloadChecks(results: TemplateUnitTestResult[]): void {
  // (a) плоский payload со всеми полями
  tryPush(results, 'checkout_extract_flat', 'extractCheckoutPayload: плоский payload', () => {
    const c = extractCheckoutPayload({
      requestKey: 'rk-001',
      idempotencyKey: 'ik-001',
      email: 'test@example.com',
      amount: 9900,
      currency: 'RUB',
      offerId: '42',
      firstName: 'Иван',
      lastName: 'Иванов',
      phone: '+79001234567',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'camp1',
      utmContent: 'cont1',
      utmTerm: 'term1'
    })
    return (
      c.requestKey === 'rk-001' &&
      c.idempotencyKey === 'ik-001' &&
      c.email === 'test@example.com' &&
      c.amount === 9900 &&
      c.currency === 'RUB' &&
      c.offerId === '42' &&
      c.firstName === 'Иван' &&
      c.lastName === 'Иванов' &&
      c.phone === '+79001234567' &&
      c.utmSource === 'google' &&
      c.utmCampaign === 'camp1'
    )
  })

  // (b) вложенный в payload
  tryPush(
    results,
    'checkout_extract_nested_payload',
    'extractCheckoutPayload: nested payload',
    () => {
      const c = extractCheckoutPayload({
        payload: {
          requestKey: 'rk-002',
          idempotencyKey: 'ik-002',
          email: 'nested@example.com',
          amount: 5000,
          currency: 'USD'
        }
      })
      return (
        c.requestKey === 'rk-002' &&
        c.email === 'nested@example.com' &&
        c.amount === 5000 &&
        c.currency === 'USD'
      )
    }
  )

  // вложенный в data
  tryPush(results, 'checkout_extract_nested_data', 'extractCheckoutPayload: nested data', () => {
    const c = extractCheckoutPayload({
      data: {
        requestKey: 'rk-003',
        idempotencyKey: 'ik-003',
        email: 'data@example.com',
        amount: 1000,
        currency: 'RUB'
      }
    })
    return c.requestKey === 'rk-003' && c.email === 'data@example.com' && c.amount === 1000
  })

  // (c) отсутствие обязательных полей → undefined
  tryPush(
    results,
    'checkout_extract_missing',
    'extractCheckoutPayload: отсутствие полей → undefined',
    () => {
      const c = extractCheckoutPayload({ offerId: '42' })
      return (
        c.requestKey === undefined &&
        c.idempotencyKey === undefined &&
        c.email === undefined &&
        c.amount === undefined &&
        c.currency === undefined &&
        c.offerId === '42'
      )
    }
  )

  // (d) amount строкой '9900' → 9900
  tryPush(
    results,
    'checkout_extract_amount_string',
    "extractCheckoutPayload: amount '9900' → 9900",
    () => {
      const c = extractCheckoutPayload({ amount: '9900' } as unknown as object)
      return c.amount === 9900
    }
  )

  // amount '0' → undefined
  tryPush(
    results,
    'checkout_extract_amount_zero',
    "extractCheckoutPayload: amount '0' → undefined",
    () => {
      const c = extractCheckoutPayload({ amount: '0' } as unknown as object)
      return c.amount === undefined
    }
  )

  // amount 'abc' → undefined
  tryPush(
    results,
    'checkout_extract_amount_nan',
    "extractCheckoutPayload: amount 'abc' → undefined",
    () => {
      const c = extractCheckoutPayload({ amount: 'abc' } as unknown as object)
      return c.amount === undefined
    }
  )

  // (e) trim строк
  tryPush(results, 'checkout_extract_trim', 'extractCheckoutPayload: trim строк', () => {
    const c = extractCheckoutPayload({
      requestKey: '  rk-trim  ',
      email: ' trimmed@example.com ',
      currency: ' RUB '
    })
    return c.requestKey === 'rk-trim' && c.email === 'trimmed@example.com' && c.currency === 'RUB'
  })

  // пустая строка → undefined
  tryPush(
    results,
    'checkout_extract_empty_string',
    'extractCheckoutPayload: пустая строка → undefined',
    () => {
      const c = extractCheckoutPayload({ requestKey: '   ', email: '' })
      return c.requestKey === undefined && c.email === undefined
    }
  )
}

// ---------------------------------------------------------------------------
// Основная экспортируемая функция
// ---------------------------------------------------------------------------

export function runGetCourseUnitChecks(): TemplateUnitTestResult[] {
  const results: TemplateUnitTestResult[] = []

  runParseGcDealsChecks(results)
  runOffersChecks(results)
  runOrderStatusChecks(results)
  runWebhookChecks(results)
  runMoneyChecks(results)
  runCheckoutPayloadChecks(results)

  return results
}
