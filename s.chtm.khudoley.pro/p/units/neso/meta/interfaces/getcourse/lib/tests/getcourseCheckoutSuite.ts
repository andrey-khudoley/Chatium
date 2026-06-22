/**
 * Интеграционные тесты: broker-подписка на web.checkout.submitted (фича 4).
 * Использует _setRequestFn (гейтвей) и _setRunAppFn (broker) для моков.
 */

import { _setRequestFn, _resetRequestFn } from '../gateway/gcGatewayClient.lib'
import { _setRunAppFn, _resetRunAppFn } from '../broker/coreBrokerClient.lib'
import {
  handleCheckoutSubmittedPayload,
  processCheckoutSubmittedDeliveries
} from '../checkout/processCheckoutSubmitted.lib'
import { type TemplateIntegrationTestResult, tryAsync } from './integrationSuiteHelpers'

// ---------------------------------------------------------------------------
// Мок-фикстуры гейтвея
// ---------------------------------------------------------------------------

function makeGatewayOkBody(data: unknown): string {
  return JSON.stringify({ ok: true, data, requestId: 'test-checkout-req' })
}

function makeGcDealOkData(paymentLink: string, dealId: string, dealNumber: string) {
  return {
    success: true,
    result: {
      success: true,
      payment_link: paymentLink,
      deal_id: dealId,
      deal_number: dealNumber,
      user_id: 'user-co-1'
    }
  }
}

// ---------------------------------------------------------------------------
// Кейсы
// ---------------------------------------------------------------------------

export async function runGetCourseCheckoutChecks(
  ctx: app.Ctx,
  results: TemplateIntegrationTestResult[]
): Promise<void> {
  // -------------------------------------------------------------------------
  // gc_checkout_handle_happy: happy path + корреляция в publish
  // -------------------------------------------------------------------------
  await tryAsync(
    results,
    'gc_checkout_handle_happy',
    'checkout: handle happy path + correlationId',
    async () => {
      const REQUEST_KEY = `rk-checkout-${Date.now()}`
      const IDEM_KEY = `web-checkout:${REQUEST_KEY}`
      const DEAL_ID = `co-deal-${Date.now()}`
      const DEAL_NUM = `CO-DEAL-${Date.now()}`

      let lastPublishRequest: unknown = null

      // Мок гейтвея: ok для createDeal
      _setRequestFn(async () => ({
        statusCode: 200,
        body: makeGatewayOkBody(makeGcDealOkData('https://pay.link/co1', DEAL_ID, DEAL_NUM))
      }))

      // Мок runAppFn: захватываем /broker/publish, остальное → success
      _setRunAppFn(async (_ctx, _app, path, body) => {
        if (path === '/broker/publish') {
          lastPublishRequest = body
        }
        return { success: true }
      })

      try {
        const r = await handleCheckoutSubmittedPayload(ctx, {
          requestKey: REQUEST_KEY,
          idempotencyKey: IDEM_KEY,
          email: 'checkout@example.com',
          amount: 9900,
          currency: 'RUB',
          offerId: '42'
        })

        if (!r.ok) return false

        // Проверяем что publish был вызван с нашим correlationId
        const pub = lastPublishRequest as Record<string, unknown> | null
        if (!pub) return false
        const req = pub.request as Record<string, unknown> | undefined
        return req?.correlationId === REQUEST_KEY
      } finally {
        _resetRequestFn()
        _resetRunAppFn()
      }
    }
  )

  // -------------------------------------------------------------------------
  // gc_checkout_handle_invalid: без email → permanent failure
  // -------------------------------------------------------------------------
  await tryAsync(
    results,
    'gc_checkout_handle_invalid',
    'checkout: невалидный payload → permanent',
    async () => {
      // Гейтвей не должен вызываться
      _setRequestFn(async () => {
        throw new Error('Гейтвей не должен вызываться при невалидном payload')
      })
      _setRunAppFn(async () => ({ success: true }))

      try {
        const r = await handleCheckoutSubmittedPayload(ctx, {
          requestKey: 'rk-inv',
          idempotencyKey: 'ik-inv',
          // email отсутствует
          amount: 9900,
          currency: 'RUB'
        })
        return !r.ok && r.permanent === true
      } finally {
        _resetRequestFn()
        _resetRunAppFn()
      }
    }
  )

  // -------------------------------------------------------------------------
  // gc_checkout_handle_idempotent: два вызова с тем же idempotencyKey
  // -------------------------------------------------------------------------
  await tryAsync(
    results,
    'gc_checkout_handle_idempotent',
    'checkout: идемпотентность',
    async () => {
      const REQUEST_KEY = `rk-idem-${Date.now()}`
      const IDEM_KEY = `web-checkout:idem:${REQUEST_KEY}`
      const DEAL_ID = `co-idem-deal-${Date.now()}`
      const DEAL_NUM = `CO-IDEM-${Date.now()}`

      // Первый вызов — гейтвей ok
      _setRequestFn(async () => ({
        statusCode: 200,
        body: makeGatewayOkBody(makeGcDealOkData('https://pay.link/idem', DEAL_ID, DEAL_NUM))
      }))
      _setRunAppFn(async () => ({ success: true }))

      let r1: Awaited<ReturnType<typeof handleCheckoutSubmittedPayload>>
      let r2: Awaited<ReturnType<typeof handleCheckoutSubmittedPayload>>

      try {
        r1 = await handleCheckoutSubmittedPayload(ctx, {
          requestKey: REQUEST_KEY,
          idempotencyKey: IDEM_KEY,
          email: 'idem@example.com',
          amount: 5000,
          currency: 'RUB',
          offerId: '99'
        })
      } finally {
        _resetRequestFn()
        _resetRunAppFn()
      }

      if (!r1.ok) return false

      // Второй вызов — гейтвей БРОСИТ если createDeal вызвали снова
      _setRequestFn(async () => {
        throw new Error('Повторный вызов createDeal недопустим при идемпотентности')
      })
      _setRunAppFn(async () => ({ success: true }))

      try {
        r2 = await handleCheckoutSubmittedPayload(ctx, {
          requestKey: REQUEST_KEY,
          idempotencyKey: IDEM_KEY,
          email: 'idem@example.com',
          amount: 5000,
          currency: 'RUB',
          offerId: '99'
        })
      } finally {
        _resetRequestFn()
        _resetRunAppFn()
      }

      // Оба успешны, orderKey совпадает
      return r2.ok && r1.orderKey === r2.orderKey
    }
  )

  // -------------------------------------------------------------------------
  // gc_checkout_process_drains: processCheckoutSubmittedDeliveries drain-цикл
  // -------------------------------------------------------------------------
  await tryAsync(
    results,
    'gc_checkout_process_drains',
    'checkout: process drains queue',
    async () => {
      const REQUEST_KEY = `rk-drain-${Date.now()}`
      const IDEM_KEY = `web-checkout:drain:${REQUEST_KEY}`
      const DEAL_ID = `co-drain-${Date.now()}`
      const DEAL_NUM = `CO-DRAIN-${Date.now()}`

      let pollCallCount = 0
      let ackCalledWithD1 = false

      const delivery = {
        deliveryId: 'd1',
        claimToken: 't1',
        subscriptionKey: 'p/units/neso/meta/interfaces/getcourse:web-checkout-submitted-listener',
        event: {
          eventId: 'ev1',
          producerModule: 'p/units/neso/meta/interfaces/web',
          eventType: 'web.checkout.submitted',
          eventVersion: 1,
          occurredAt: Date.now(),
          publishedAt: Date.now(),
          payload: {
            requestKey: REQUEST_KEY,
            idempotencyKey: IDEM_KEY,
            email: 'drain@example.com',
            amount: 3000,
            currency: 'RUB',
            offerId: '99'
          }
        }
      }

      // Мок гейтвея: ok
      _setRequestFn(async () => ({
        statusCode: 200,
        body: makeGatewayOkBody(makeGcDealOkData('https://pay.link/drain', DEAL_ID, DEAL_NUM))
      }))

      _setRunAppFn(async (_ctx, _app, path, body) => {
        if (path === '/broker/poll') {
          pollCallCount++
          // Первый poll → 1 delivery; второй → пусто
          if (pollCallCount === 1) {
            return { success: true, deliveries: [delivery] }
          }
          return { success: true, deliveries: [] }
        }
        if (path === '/broker/ack') {
          const req = (body as Record<string, unknown>).request as Record<string, unknown>
          const items = req?.items as Array<{ deliveryId: string }> | undefined
          if (Array.isArray(items) && items.some((i) => i.deliveryId === 'd1')) {
            ackCalledWithD1 = true
          }
          return { success: true }
        }
        // register, publish, fail → success
        return { success: true }
      })

      try {
        const result = await processCheckoutSubmittedDeliveries(ctx, { limit: 10 })
        return result.processed === 1 && ackCalledWithD1
      } finally {
        _resetRequestFn()
        _resetRunAppFn()
      }
    }
  )

  // -------------------------------------------------------------------------
  // gc_checkout_process_empty: poll пустой с самого начала
  // -------------------------------------------------------------------------
  await tryAsync(
    results,
    'gc_checkout_process_empty',
    'checkout: process с пустой очередью',
    async () => {
      _setRunAppFn(async (_ctx, _app, path) => {
        if (path === '/broker/poll') {
          return { success: true, deliveries: [] }
        }
        return { success: true }
      })
      _setRequestFn(async () => {
        throw new Error('Гейтвей не должен вызываться при пустой очереди')
      })

      try {
        const result = await processCheckoutSubmittedDeliveries(ctx, { limit: 10 })
        return result.processed === 0 && result.failed === 0 && result.skipped === 0
      } finally {
        _resetRequestFn()
        _resetRunAppFn()
      }
    }
  )

  // -------------------------------------------------------------------------
  // gc_checkout_process_fail: транзиентный сбой createOrder → delivery в fail (не ack)
  // -------------------------------------------------------------------------
  await tryAsync(
    results,
    'gc_checkout_process_fail',
    'checkout: транзиентный сбой → fail',
    async () => {
      const REQUEST_KEY = `rk-fail-${Date.now()}`
      const IDEM_KEY = `web-checkout:fail:${REQUEST_KEY}`

      let pollCallCount = 0
      let failCalledWithDf1 = false
      let ackCalledWithDf1 = false

      const delivery = {
        deliveryId: 'df1',
        claimToken: 'tf1',
        subscriptionKey: 'p/units/neso/meta/interfaces/getcourse:web-checkout-submitted-listener',
        event: {
          eventId: 'evf1',
          producerModule: 'p/units/neso/meta/interfaces/web',
          eventType: 'web.checkout.submitted',
          eventVersion: 1,
          occurredAt: Date.now(),
          publishedAt: Date.now(),
          payload: {
            requestKey: REQUEST_KEY,
            idempotencyKey: IDEM_KEY,
            email: 'fail@example.com',
            amount: 4000,
            currency: 'RUB',
            offerId: '99'
          }
        }
      }

      // Мок гейтвея: транзиентная ошибка (ok:false) → createOrder вернёт failure (не permanent)
      _setRequestFn(async () => ({
        statusCode: 200,
        body: JSON.stringify({
          ok: false,
          error: { code: 'INVOKE_GC_UPSTREAM_ERROR', message: 'upstream' }
        })
      }))

      _setRunAppFn(async (_ctx, _app, path, body) => {
        if (path === '/broker/poll') {
          pollCallCount++
          if (pollCallCount === 1) return { success: true, deliveries: [delivery] }
          return { success: true, deliveries: [] }
        }
        if (path === '/broker/fail') {
          const req = (body as Record<string, unknown>).request as Record<string, unknown>
          const items = req?.items as Array<{ deliveryId: string }> | undefined
          if (Array.isArray(items) && items.some((i) => i.deliveryId === 'df1')) {
            failCalledWithDf1 = true
          }
          return { success: true }
        }
        if (path === '/broker/ack') {
          const req = (body as Record<string, unknown>).request as Record<string, unknown>
          const items = req?.items as Array<{ deliveryId: string }> | undefined
          if (Array.isArray(items) && items.some((i) => i.deliveryId === 'df1')) {
            ackCalledWithDf1 = true
          }
          return { success: true }
        }
        return { success: true }
      })

      try {
        const result = await processCheckoutSubmittedDeliveries(ctx, { limit: 10 })
        // Транзиентный сбой → fail (не ack)
        return result.failed === 1 && failCalledWithDf1 && !ackCalledWithDf1
      } finally {
        _resetRequestFn()
        _resetRunAppFn()
      }
    }
  )
}
