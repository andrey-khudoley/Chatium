/**
 * Фаза 4 юнит-сьюта LifePay: парсинг и проверка webhook.
 *
 *   - runWebhookParseChecks: parseWebhookBody, unwrapWebhookBody (все стратегии),
 *     extractDataFromRawMultipart, isSuccessfulPayment;
 *   - runWebhookReadChecks: readWebhookDataField (FormData string / File / absent);
 *   - runWebhookTokenChecks: checkWebhookToken (not_configured / missing / mismatch / valid).
 */

import {
  parseWebhookBody,
  checkWebhookToken,
  unwrapWebhookBody,
  readWebhookDataField,
  extractDataFromRawMultipart,
  isSuccessfulPayment
} from '../webhook/processWebhook'
import { buildCreateDealArgs } from '../webhook/gcDealUpdate'
import { calculateGcDealPayableAmount } from '../gateway/gcDealResolver'
import { tryPush, tryPushAsync, type LifepayUnitTestResult } from './lifepayUnitHelpers'

export function runWebhookParseChecks(results: LifepayUnitTestResult[]): void {
  tryPush(results, 'lp_webhook_parse_basic', 'parseWebhookBody читает основные поля', () => {
    const r = parseWebhookBody({
      number: '123',
      type: 'payment',
      status: 'success',
      method: 'internetAcquiring',
      amount: '1.00',
      order: { number: 'A4' }
    })
    return (
      r.number === '123' &&
      r.type === 'payment' &&
      r.status === 'success' &&
      r.method === 'internetAcquiring' &&
      r.amount === '1.00' &&
      r.orderNumber === 'A4'
    )
  })

  tryPush(
    results,
    'lp_webhook_extract_order_number_nested',
    'parseWebhookBody извлекает order.number из вложенного JSON',
    () => parseWebhookBody({ number: 'x', order: { number: 'NESTED1' } }).orderNumber === 'NESTED1'
  )

  tryPush(
    results,
    'lp_webhook_email_raw',
    'parseWebhookBody возвращает сырой email (без маскирования)',
    () => {
      const r = parseWebhookBody({ number: '1', email: 'buyer@shop.ru' })
      return r.email === 'buyer@shop.ru'
    }
  )

  tryPush(
    results,
    'lp_webhook_email_from_customer',
    'parseWebhookBody берёт email из customer.email при отсутствии в корне',
    () => {
      const r = parseWebhookBody({ number: '1', customer: { email: 'x@y.z' } })
      return r.email === 'x@y.z'
    }
  )

  tryPush(
    results,
    'lp_webhook_no_body',
    'parseWebhookBody на пустом body возвращает пустые строки',
    () => {
      const r = parseWebhookBody(null)
      return r.number === '' && r.orderNumber === '' && r.email === ''
    }
  )

  tryPush(
    results,
    'lp_webhook_unwrap_object',
    'unwrapWebhookBody: чистый объект → strategy=object',
    () => {
      const u = unwrapWebhookBody({ number: '1', type: 'payment' }, 'application/json')
      return (
        u.strategy === 'object' &&
        typeof u.payload === 'object' &&
        (u.payload as Record<string, unknown>).number === '1'
      )
    }
  )

  tryPush(
    results,
    'lp_webhook_unwrap_json_string',
    'unwrapWebhookBody: JSON-строка → strategy=json_string',
    () => {
      const u = unwrapWebhookBody(
        '{"number":"X9","type":"payment","order":{"number":"ORD1"}}',
        'text/plain'
      )
      const p = u.payload as Record<string, unknown>
      return (
        u.strategy === 'json_string' &&
        p.number === 'X9' &&
        (p.order as Record<string, unknown>).number === 'ORD1'
      )
    }
  )

  tryPush(
    results,
    'lp_webhook_unwrap_form_data_field',
    'unwrapWebhookBody: {data:"<json>"} → strategy=form_data_field_json',
    () => {
      const u = unwrapWebhookBody(
        { data: '{"number":"Y2","status":"success"}' },
        'application/x-www-form-urlencoded'
      )
      const p = u.payload as Record<string, unknown>
      return u.strategy === 'form_data_field_json' && p.number === 'Y2' && p.status === 'success'
    }
  )

  tryPush(
    results,
    'lp_webhook_unwrap_object_data_field',
    'unwrapWebhookBody: {data:{<object>}} → strategy=object_data_field',
    () => {
      const u = unwrapWebhookBody(
        { data: { number: 'V5', type: 'payment', order: { number: 'ORDV5' } } },
        'application/json'
      )
      const p = u.payload as Record<string, unknown>
      return (
        u.strategy === 'object_data_field' &&
        p.number === 'V5' &&
        (p.order as Record<string, unknown>).number === 'ORDV5'
      )
    }
  )

  tryPush(
    results,
    'lp_webhook_unwrap_json_string_data_object',
    'unwrapWebhookBody: \'{"data":{...}}\' → strategy=object_data_field',
    () => {
      const u = unwrapWebhookBody('{"data":{"number":"U6","type":"refund"}}', 'application/json')
      const p = u.payload as Record<string, unknown>
      return u.strategy === 'object_data_field' && p.number === 'U6' && p.type === 'refund'
    }
  )

  tryPush(
    results,
    'lp_webhook_unwrap_form_urlencoded_string',
    'unwrapWebhookBody: строка "a=1&b=2" → strategy=form_flat',
    () => {
      const u = unwrapWebhookBody('number=Z3&type=payment&amount=10.00', '')
      const p = u.payload as Record<string, unknown>
      return u.strategy === 'form_flat' && p.number === 'Z3' && p.type === 'payment'
    }
  )

  tryPush(
    results,
    'lp_webhook_unwrap_form_urlencoded_data_json',
    'unwrapWebhookBody: строка "data=<urlencoded-json>" → strategy=form_data_field_json',
    () => {
      const json = '{"number":"W4","type":"refund"}'
      const u = unwrapWebhookBody(`data=${encodeURIComponent(json)}`, '')
      const p = u.payload as Record<string, unknown>
      return u.strategy === 'form_data_field_json' && p.number === 'W4' && p.type === 'refund'
    }
  )

  tryPush(results, 'lp_webhook_unwrap_null', 'unwrapWebhookBody(null) → strategy=noop', () => {
    const u = unwrapWebhookBody(null, '')
    return u.strategy === 'noop' && u.payload === null
  })

  tryPush(
    results,
    'lp_webhook_raw_multipart_extract',
    'extractDataFromRawMultipart: достаёт поле data из сырого multipart-тела',
    () => {
      const json = '{"number":"M4","status":"success"}'
      const raw =
        '--BOUNDARY\r\n' +
        'Content-Disposition: form-data; name="data"\r\n' +
        '\r\n' +
        json +
        '\r\n--BOUNDARY--\r\n'
      if (extractDataFromRawMultipart(raw, 'data') !== json) return false
      // нет нужного поля → null
      if (extractDataFromRawMultipart(raw, 'other') !== null) return false
      // не multipart → null
      if (extractDataFromRawMultipart('{"plain":"json"}', 'data') !== null) return false
      return true
    }
  )

  tryPush(
    results,
    'lp_webhook_success_condition',
    'isSuccessfulPayment: только payment+success → true',
    () => {
      const make = (type: string, status: string) =>
        isSuccessfulPayment({
          number: '1',
          type,
          status,
          method: 'sbp',
          amount: '1.00',
          orderNumber: 'O',
          email: ''
        })
      if (make('payment', 'success') !== true) return false
      if (make('payment', 'fail') !== false) return false
      if (make('refund', 'success') !== false) return false
      if (make('', '') !== false) return false
      return true
    }
  )
}

export async function runWebhookReadChecks(results: LifepayUnitTestResult[]): Promise<void> {
  // FormData с текстовым полем `data` (типичный LifePay-multipart).
  await tryPushAsync(
    results,
    'lp_webhook_formdata_string',
    'readWebhookDataField: текстовое поле data → строка',
    async () => {
      const form = { get: (k: string) => (k === 'data' ? '{"number":"F1"}' : null) }
      return (await readWebhookDataField(form, 'data')) === '{"number":"F1"}'
    }
  )

  // FormData, где `data` пришёл File-подобным объектом — читаем через .text().
  await tryPushAsync(
    results,
    'lp_webhook_formdata_file',
    'readWebhookDataField: File-подобное поле → .text()',
    async () => {
      const form = {
        get: (k: string) =>
          k === 'data'
            ? { name: 'data', type: 'application/json', text: async () => '{"number":"F2"}' }
            : null
      }
      return (await readWebhookDataField(form, 'data')) === '{"number":"F2"}'
    }
  )

  // Поля нет / FormData отсутствует → null.
  await tryPushAsync(
    results,
    'lp_webhook_formdata_absent',
    'readWebhookDataField: нет поля / нет form → null',
    async () => {
      const empty = { get: () => null }
      if ((await readWebhookDataField(empty, 'data')) !== null) return false
      if ((await readWebhookDataField(null, 'data')) !== null) return false
      if ((await readWebhookDataField(undefined, 'data')) !== null) return false
      return true
    }
  )
}

export function runGcDealUpdateChecks(results: LifepayUnitTestResult[]): void {
  tryPush(
    results,
    'lp_gc_deal_amount_partial_payment_remainder',
    'calculateGcDealPayableAmount: cost=100 и user_payed_money_value=95 → amount=5',
    () => {
      const r = calculateGcDealPayableAmount({
        cost: 100,
        payed_value: 95,
        user_payed_money_value: 95
      })
      return r.ok && r.amount === 5 && r.cost === 100 && r.alreadyPaid === 95
    }
  )

  tryPush(
    results,
    'lp_gc_deal_amount_partial_payment_fallback',
    'calculateGcDealPayableAmount: payed_value используется как fallback частичной оплаты',
    () => {
      const r = calculateGcDealPayableAmount({
        cost: '100.00',
        payed_value: '95.00'
      })
      return r.ok && r.amount === 5 && r.alreadyPaid === 95
    }
  )

  tryPush(
    results,
    'lp_gc_deal_amount_paid_by_values',
    'calculateGcDealPayableAmount: если оплачено не меньше cost, новый счёт не нужен',
    () => {
      const r = calculateGcDealPayableAmount({
        cost: 100,
        payed_value: 100,
        user_payed_money_value: 100
      })
      return !r.ok && r.reason === 'already_paid' && r.alreadyPaid === 100
    }
  )

  tryPush(
    results,
    'lp_gc_deal_update_basic_mapping',
    'buildCreateDealArgs: базовый маппинг полей deal и user',
    () => {
      const args = buildCreateDealArgs({
        dealNumber: 'ORD-001',
        email: 'buyer@test.ru',
        createPayment: true
      })
      return (
        args.params.deal.deal_number === 'ORD-001' &&
        args.params.deal.deal_status === 'payed' &&
        args.params.deal.deal_is_paid === '1' &&
        args.params.user.email === 'buyer@test.ru'
      )
    }
  )

  tryPush(
    results,
    'lp_gc_deal_update_deal_number_from_gc',
    'buildCreateDealArgs: dealNumber=GC-NUMBER-42 → deal_number === "GC-NUMBER-42"',
    () => {
      const args = buildCreateDealArgs({
        dealNumber: 'GC-NUMBER-42',
        email: 'a@b.c',
        createPayment: true
      })
      return args.params.deal.deal_number === 'GC-NUMBER-42'
    }
  )

  tryPush(
    results,
    'lp_gc_deal_update_deal_is_paid_string',
    'buildCreateDealArgs: deal_is_paid строго строка "1", не число',
    () => {
      const args = buildCreateDealArgs({ dealNumber: 'X', email: 'a@b.c', createPayment: true })
      return (
        typeof args.params.deal.deal_is_paid === 'string' && args.params.deal.deal_is_paid === '1'
      )
    }
  )

  tryPush(
    results,
    'lp_gc_deal_update_amount_parsed',
    'buildCreateDealArgs: amount="1500.00" → deal_cost === 1500 (число)',
    () => {
      const args = buildCreateDealArgs({
        dealNumber: 'X',
        email: 'a@b.c',
        amount: '1500.00',
        createPayment: true
      })
      return args.params.deal.deal_cost === 1500
    }
  )

  tryPush(
    results,
    'lp_gc_deal_update_amount_undefined',
    'buildCreateDealArgs: amount=undefined → deal_cost отсутствует',
    () => {
      const args = buildCreateDealArgs({ dealNumber: 'X', email: 'a@b.c', createPayment: true })
      return !('deal_cost' in args.params.deal)
    }
  )

  tryPush(
    results,
    'lp_gc_deal_update_amount_zero',
    'buildCreateDealArgs: amount="0" → deal_cost отсутствует',
    () => {
      const args = buildCreateDealArgs({
        dealNumber: 'X',
        email: 'a@b.c',
        amount: '0',
        createPayment: true
      })
      return !('deal_cost' in args.params.deal)
    }
  )

  tryPush(
    results,
    'lp_gc_deal_update_amount_zero_decimal',
    'buildCreateDealArgs: amount="0.00" → deal_cost отсутствует',
    () => {
      const args = buildCreateDealArgs({
        dealNumber: 'X',
        email: 'a@b.c',
        amount: '0.00',
        createPayment: true
      })
      return !('deal_cost' in args.params.deal)
    }
  )

  tryPush(
    results,
    'lp_gc_deal_update_amount_non_numeric',
    'buildCreateDealArgs: amount="abc" → deal_cost отсутствует',
    () => {
      const args = buildCreateDealArgs({
        dealNumber: 'X',
        email: 'a@b.c',
        amount: 'abc',
        createPayment: true
      })
      return !('deal_cost' in args.params.deal)
    }
  )

  tryPush(
    results,
    'lp_gc_deal_update_structure',
    'buildCreateDealArgs: структура строго { params: { user, deal } }, нет лишних полей',
    () => {
      const args = buildCreateDealArgs({
        dealNumber: 'ORD-99',
        email: 'x@y.z',
        amount: '500',
        createPayment: true
      }) as Record<string, unknown>
      const topKeys = Object.keys(args)
      if (topKeys.length !== 1 || topKeys[0] !== 'params') return false
      const params = args.params as Record<string, unknown>
      const paramKeys = Object.keys(params).sort()
      if (paramKeys.join(',') !== 'deal,user') return false
      // нет correlationId/dealId на верхнем уровне или в params
      if ('correlationId' in args || 'dealId' in args) return false
      if ('correlationId' in params || 'dealId' in params) return false
      return true
    }
  )

  tryPush(
    results,
    'lp_gc_deal_update_create_payment_true',
    'buildCreateDealArgs: createPayment=true → deal_is_paid === "1"',
    () => {
      const args = buildCreateDealArgs({ dealNumber: 'X', email: 'a@b.c', createPayment: true })
      return args.params.deal.deal_is_paid === '1'
    }
  )

  tryPush(
    results,
    'lp_gc_deal_update_create_payment_false',
    'buildCreateDealArgs: createPayment=false → deal_is_paid === "0"',
    () => {
      const args = buildCreateDealArgs({ dealNumber: 'X', email: 'a@b.c', createPayment: false })
      return args.params.deal.deal_is_paid === '0'
    }
  )

  tryPush(
    results,
    'lp_gc_deal_update_custom_status',
    'buildCreateDealArgs: dealStatus="in_work" → deal_status === "in_work"',
    () => {
      const args = buildCreateDealArgs({
        dealNumber: 'X',
        email: 'a@b.c',
        createPayment: true,
        dealStatus: 'in_work'
      })
      return args.params.deal.deal_status === 'in_work'
    }
  )

  tryPush(
    results,
    'lp_gc_deal_update_empty_status_fallback',
    'buildCreateDealArgs: пустой dealStatus сохраняет fallback "payed"',
    () => {
      const args = buildCreateDealArgs({
        dealNumber: 'X',
        email: 'a@b.c',
        createPayment: true,
        dealStatus: '   '
      })
      return args.params.deal.deal_status === 'payed'
    }
  )
}

export function runWebhookTokenChecks(results: LifepayUnitTestResult[]): void {
  tryPush(
    results,
    'lp_webhook_token_not_configured',
    'checkWebhookToken(any, "") → "not_configured"',
    () => checkWebhookToken('x', '') === 'not_configured'
  )

  tryPush(
    results,
    'lp_webhook_token_missing',
    'checkWebhookToken(null, "set") → "missing"',
    () =>
      checkWebhookToken(null, 'real-token-12345678901234567890') === 'missing' &&
      checkWebhookToken(undefined, 'real-token-12345678901234567890') === 'missing'
  )

  tryPush(
    results,
    'lp_webhook_token_mismatch_403',
    'checkWebhookToken("wrong", "right") → "mismatch"',
    () => checkWebhookToken('wrong', 'right') === 'mismatch'
  )

  tryPush(
    results,
    'lp_webhook_token_valid',
    'checkWebhookToken("same", "same") → "valid"',
    () => checkWebhookToken('abc123', 'abc123') === 'valid'
  )
}
