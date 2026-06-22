/**
 * Юнит-набор checkout: normalizeForm, socketMessages, key-builders, broker schema.
 * Синхронные проверки без Heap.
 */
import { normalizeCheckoutForm } from '../checkout/normalizeForm.lib'
import {
  buildCheckoutSubmittedMessage,
  buildPaymentReadyMessage,
  buildCheckoutFailedMessage
} from '../checkout/socketMessages.lib'
import {
  buildIdempotencyKey,
  buildSocketId,
  buildEventIdempotencyKey,
  DEFAULT_CURRENCY
} from '../checkout/constants'
import { BROKER_EVENT_CONTRACTS } from '../../contracts/brokerEvents'
import { type TemplateUnitTestResult, push, tryPush } from './templateUnitSuiteHelpers'

export type { TemplateUnitTestResult }

// ---------------------------------------------------------------------------
// normalizeCheckoutForm
// ---------------------------------------------------------------------------

function runNormalizeFormChecks(results: TemplateUnitTestResult[]): void {
  tryPush(results, 'checkout_normalize_required_email', 'normalizeForm: email обязателен', () => {
    const r = normalizeCheckoutForm({ amount: '9900', currency: 'RUB' })
    return r.ok === false
  })

  tryPush(results, 'checkout_normalize_required_amount', 'normalizeForm: amount обязателен', () => {
    const r = normalizeCheckoutForm({ email: 'a@b.com', currency: 'RUB' })
    return r.ok === false
  })

  tryPush(
    results,
    'checkout_normalize_required_currency_fallback',
    'normalizeForm: currency fallback DEFAULT_CURRENCY',
    () => {
      const r = normalizeCheckoutForm({ email: 'a@b.com', amount: '9900' })
      return r.ok === true && r.value.currency === DEFAULT_CURRENCY
    }
  )

  tryPush(results, 'checkout_normalize_trim_email', 'normalizeForm: email тримируется', () => {
    const r = normalizeCheckoutForm({
      email: '  user@example.com  ',
      amount: '9900',
      currency: 'RUB'
    })
    return r.ok === true && r.value.email === 'user@example.com'
  })

  tryPush(
    results,
    'checkout_normalize_amount_string_to_number',
    'normalizeForm: amount "9900" → 9900',
    () => {
      const r = normalizeCheckoutForm({ email: 'a@b.com', amount: '9900', currency: 'RUB' })
      return r.ok === true && r.value.amount === 9900
    }
  )

  tryPush(
    results,
    'checkout_normalize_amount_zero_invalid',
    'normalizeForm: amount "0" → невалид',
    () => {
      const r = normalizeCheckoutForm({ email: 'a@b.com', amount: '0', currency: 'RUB' })
      return r.ok === false
    }
  )

  tryPush(
    results,
    'checkout_normalize_amount_abc_invalid',
    'normalizeForm: amount "abc" → невалид',
    () => {
      const r = normalizeCheckoutForm({ email: 'a@b.com', amount: 'abc', currency: 'RUB' })
      return r.ok === false
    }
  )

  tryPush(
    results,
    'checkout_normalize_optional_empty_excluded',
    'normalizeForm: пустые опц. поля не включаются',
    () => {
      const r = normalizeCheckoutForm({
        email: 'a@b.com',
        amount: '100',
        currency: 'RUB',
        firstName: '',
        lastName: '  ',
        phone: '',
        offerId: ''
      })
      return (
        r.ok === true &&
        !('firstName' in r.value) &&
        !('lastName' in r.value) &&
        !('phone' in r.value) &&
        !('offerId' in r.value)
      )
    }
  )

  tryPush(
    results,
    'checkout_normalize_optional_present',
    'normalizeForm: заполненные опц. поля включаются',
    () => {
      const r = normalizeCheckoutForm({
        email: 'a@b.com',
        amount: '100',
        currency: 'RUB',
        firstName: 'Иван',
        offerId: '42'
      })
      return r.ok === true && r.value.firstName === 'Иван' && r.value.offerId === '42'
    }
  )

  tryPush(results, 'checkout_normalize_non_object', 'normalizeForm: не объект → ошибка', () => {
    const r = normalizeCheckoutForm(null)
    return r.ok === false
  })
}

// ---------------------------------------------------------------------------
// socketMessages builders
// ---------------------------------------------------------------------------

function runSocketMessageChecks(results: TemplateUnitTestResult[]): void {
  tryPush(results, 'checkout_msg_submitted_type', 'buildCheckoutSubmittedMessage: type', () => {
    const m = buildCheckoutSubmittedMessage('rk1')
    return m.type === 'checkout_submitted' && m.data.requestKey === 'rk1'
  })

  tryPush(
    results,
    'checkout_msg_payment_ready_type',
    'buildPaymentReadyMessage: type + url',
    () => {
      const m = buildPaymentReadyMessage('rk2', 'https://pay.link/x', 'ok1', 'D-1')
      return (
        m.type === 'payment_ready' &&
        m.data.requestKey === 'rk2' &&
        m.data.paymentUrl === 'https://pay.link/x' &&
        m.data.orderKey === 'ok1' &&
        m.data.gcDealNumber === 'D-1'
      )
    }
  )

  tryPush(
    results,
    'checkout_msg_payment_ready_optional',
    'buildPaymentReadyMessage: без orderKey/gcDealNumber',
    () => {
      const m = buildPaymentReadyMessage('rk3', 'https://pay.link/y')
      return m.type === 'payment_ready' && m.data.paymentUrl === 'https://pay.link/y'
    }
  )

  tryPush(results, 'checkout_msg_failed_type', 'buildCheckoutFailedMessage: type + error', () => {
    const m = buildCheckoutFailedMessage('rk4', 'Ошибка тест')
    return (
      m.type === 'checkout_failed' && m.data.requestKey === 'rk4' && m.data.error === 'Ошибка тест'
    )
  })
}

// ---------------------------------------------------------------------------
// Key builders
// ---------------------------------------------------------------------------

function runKeyBuilderChecks(results: TemplateUnitTestResult[]): void {
  tryPush(
    results,
    'checkout_buildIdempotencyKey_prefix',
    'buildIdempotencyKey: префикс web-checkout:',
    () => {
      const k = buildIdempotencyKey('rk-test')
      return k === 'web-checkout:rk-test'
    }
  )

  tryPush(results, 'checkout_buildSocketId_prefix', 'buildSocketId: префикс checkout:', () => {
    const k = buildSocketId('rk-test')
    return k === 'checkout:rk-test'
  })

  tryPush(
    results,
    'checkout_buildEventIdempotencyKey_prefix',
    'buildEventIdempotencyKey: префикс web-checkout-submitted:',
    () => {
      const k = buildEventIdempotencyKey('rk-test')
      return k === 'web-checkout-submitted:rk-test'
    }
  )

  tryPush(results, 'checkout_key_builders_stable', 'key builders стабильны на одном входе', () => {
    const rk = 'rk-stable-123'
    return (
      buildIdempotencyKey(rk) === buildIdempotencyKey(rk) &&
      buildSocketId(rk) === buildSocketId(rk) &&
      buildEventIdempotencyKey(rk) === buildEventIdempotencyKey(rk)
    )
  })
}

// ---------------------------------------------------------------------------
// Broker event contract schema
// ---------------------------------------------------------------------------

function runBrokerSchemaChecks(results: TemplateUnitTestResult[]): void {
  const contract = BROKER_EVENT_CONTRACTS[0]

  tryPush(
    results,
    'checkout_broker_schema_format',
    'broker contract: payloadSchemaFormat === json-schema-subset-v1',
    () => {
      return contract.payloadSchemaFormat === 'json-schema-subset-v1'
    }
  )

  tryPush(
    results,
    'checkout_broker_schema_no_additional',
    'broker schema: additionalProperties === false',
    () => {
      return (
        (contract.payloadSchema as { additionalProperties?: unknown }).additionalProperties ===
        false
      )
    }
  )

  tryPush(
    results,
    'checkout_broker_schema_required_5',
    'broker schema: required содержит 5 ключей',
    () => {
      const schema = contract.payloadSchema as unknown as { required?: unknown[] }
      return Array.isArray(schema.required) && schema.required.length === 5
    }
  )

  tryPush(
    results,
    'checkout_broker_schema_required_keys',
    'broker schema: required ключи верные',
    () => {
      const schema = contract.payloadSchema as unknown as { required?: string[] }
      const req = new Set(schema.required ?? [])
      return (
        req.has('requestKey') &&
        req.has('idempotencyKey') &&
        req.has('email') &&
        req.has('amount') &&
        req.has('currency')
      )
    }
  )

  tryPush(
    results,
    'checkout_broker_schema_optional_fields',
    'broker schema: properties содержит все опц. поля',
    () => {
      const schema = contract.payloadSchema as { properties?: Record<string, unknown> }
      const props = schema.properties ?? {}
      const optional = [
        'offerId',
        'firstName',
        'lastName',
        'phone',
        'utmSource',
        'utmMedium',
        'utmCampaign',
        'utmContent',
        'utmTerm',
        'comment',
        'sourceUrl',
        'returnUrl'
      ]
      return optional.every((k) => k in props)
    }
  )

  tryPush(
    results,
    'checkout_broker_schema_no_ref',
    'broker schema: нет $ref/format/minLength',
    () => {
      const text = JSON.stringify(contract.payloadSchema)
      return !text.includes('"$ref"') && !text.includes('"format"') && !text.includes('"minLength"')
    }
  )
}

// ---------------------------------------------------------------------------
// Экспортируемый прогон
// ---------------------------------------------------------------------------

export function runCheckoutUnitChecks(): TemplateUnitTestResult[] {
  const results: TemplateUnitTestResult[] = []

  runNormalizeFormChecks(results)
  runSocketMessageChecks(results)
  runKeyBuilderChecks(results)
  runBrokerSchemaChecks(results)

  return results
}
