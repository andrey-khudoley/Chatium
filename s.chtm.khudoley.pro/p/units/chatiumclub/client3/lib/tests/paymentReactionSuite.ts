/**
 * Юнит-набор сценария C (оплата → реакция Леночки): синхронные проверки без Heap.
 * Покрывает безопасное сравнение токенов, нормализацию событий GC и подстановку шаблона.
 */
import {
  normalizePaymentEvent,
  renderReactionMessage,
  DEFAULT_REACTION_TEMPLATE
} from '../paymentReaction.lib'
import { safeEqualToken } from '../webhookSecret.lib'

export type PaymentReactionUnitTestResult = {
  id: string
  title: string
  passed: boolean
  error?: string
}

function tryPush(
  results: PaymentReactionUnitTestResult[],
  id: string,
  title: string,
  fn: () => boolean
): void {
  try {
    results.push({ id, title, passed: fn() })
  } catch (e) {
    results.push({ id, title, passed: false, error: (e as Error)?.message ?? String(e) })
  }
}

export function runPaymentReactionUnitChecks(): PaymentReactionUnitTestResult[] {
  const results: PaymentReactionUnitTestResult[] = []

  // safeEqualToken
  tryPush(results, 'webhook_safeEqualToken_equal', 'safeEqualToken равные строки', () => {
    return safeEqualToken('abc123XYZ', 'abc123XYZ')
  })
  tryPush(results, 'webhook_safeEqualToken_diff', 'safeEqualToken разные строки', () => {
    return !safeEqualToken('abc123XYZ', 'abc123XYZ_')
  })
  tryPush(results, 'webhook_safeEqualToken_empty', 'safeEqualToken пустые строки', () => {
    return !safeEqualToken('', '') && !safeEqualToken('a', '') && !safeEqualToken('', 'b')
  })
  tryPush(results, 'webhook_safeEqualToken_length_diff', 'safeEqualToken разная длина', () => {
    return !safeEqualToken('short', 'mucholongerstring')
  })
  tryPush(results, 'webhook_safeEqualToken_non_strings', 'safeEqualToken не-строки', () => {
    return !safeEqualToken(1 as unknown as string, '1')
  })

  // normalizePaymentEvent
  tryPush(results, 'normalize_empty_payload', 'normalizePaymentEvent пустой объект', () => {
    const e = normalizePaymentEvent({})
    return e.email === '' && e.dealId === '' && e.amount === 0 && e.gcEventId === ''
  })

  tryPush(results, 'normalize_user_email_top', 'normalizePaymentEvent email на user', () => {
    const e = normalizePaymentEvent({ user: { email: 'a@b.c' }, deal: { id: '777', price: 1000 } })
    return e.email === 'a@b.c' && e.dealId === '777' && e.amount === 1000
  })

  tryPush(
    results,
    'normalize_event_id_synthetic',
    'normalizePaymentEvent синтетический event_id',
    () => {
      const e = normalizePaymentEvent({ user: { email: 'a@b.c' }, deal: { id: '777' } })
      return e.gcEventId === 'pay_777_a@b.c'
    }
  )

  tryPush(results, 'normalize_event_id_explicit', 'normalizePaymentEvent явный id', () => {
    const e = normalizePaymentEvent({ id: 'gc-evt-1', user: { email: 'a@b.c' } })
    return e.gcEventId === 'gc-evt-1'
  })

  tryPush(results, 'normalize_amount_string', 'normalizePaymentEvent amount как строка', () => {
    const e = normalizePaymentEvent({ deal: { price: '500.50' } })
    return e.amount === 500.5
  })

  // renderReactionMessage
  tryPush(results, 'render_default_template', 'renderReactionMessage по дефолтному шаблону', () => {
    const text = renderReactionMessage(DEFAULT_REACTION_TEMPLATE, {
      gcEventId: 'x',
      email: 'a@b.c',
      name: 'Иван',
      dealId: '777',
      amount: 1000,
      dialogId: '',
      userId: ''
    })
    return text.includes('Иван') && text.includes('777') && text.includes('1000')
  })

  tryPush(
    results,
    'render_no_name_fallback',
    'renderReactionMessage без имени → "участник"',
    () => {
      const text = renderReactionMessage('{{name}}-{{dealId}}-{{amount}}', {
        gcEventId: '',
        email: '',
        name: '',
        dealId: '',
        amount: 0,
        dialogId: '',
        userId: ''
      })
      return text === 'участник-—-—'
    }
  )

  tryPush(results, 'render_replace_all', 'renderReactionMessage заменяет все вхождения', () => {
    const text = renderReactionMessage('{{name}} {{name}}', {
      gcEventId: '',
      email: '',
      name: 'Иван',
      dealId: '',
      amount: 0,
      dialogId: '',
      userId: ''
    })
    return text === 'Иван Иван'
  })

  return results
}
