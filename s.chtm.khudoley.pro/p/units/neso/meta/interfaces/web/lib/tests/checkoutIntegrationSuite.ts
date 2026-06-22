/**
 * Интеграционные тесты checkout web flow.
 * Мок broker через _setRunAppFn / _resetRunAppFn.
 */
import { _setRunAppFn, _resetRunAppFn } from '../broker/coreBrokerClient.lib'
import { checkoutSubmitRoute } from '../../api/checkout/submit'
import { checkoutStatusRoute } from '../../api/checkout/status'
import { processOrderCreatedDeliveries } from '../checkout/processOrderCreated.lib'
import * as checkoutRequestsRepo from '../../repos/checkoutRequests.repo'
import { buildIdempotencyKey } from '../checkout/constants'
import { type TemplateIntegrationTestResult, tryAsync } from './integrationSuiteHelpers'

// ---------------------------------------------------------------------------
// Утилиты фикстур
// ---------------------------------------------------------------------------

function makeDelivery(
  requestKey: string,
  idempotencyKey: string,
  paymentUrl: string,
  deliveryId = 'd-test-1'
) {
  return {
    deliveryId,
    claimToken: `ct-${deliveryId}`,
    subscriptionKey: 'p/units/neso/meta/interfaces/web:getcourse-order-created-listener',
    event: {
      eventId: `ev-${deliveryId}`,
      producerModule: 'p/units/neso/meta/interfaces/getcourse',
      eventType: 'getcourse.order.created',
      eventVersion: 1,
      occurredAt: Date.now(),
      publishedAt: Date.now(),
      payload: {
        idempotencyKey,
        orderKey: `ok-${deliveryId}`,
        gcDealNumber: `GC-${deliveryId}`,
        gcDealId: `gid-${deliveryId}`,
        paymentUrl
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Кейсы
// ---------------------------------------------------------------------------

export async function runCheckoutIntegrationChecks(
  ctx: app.Ctx
): Promise<TemplateIntegrationTestResult[]> {
  const results: TemplateIntegrationTestResult[] = []

  // -------------------------------------------------------------------------
  // web_checkout_submit_publishes
  // -------------------------------------------------------------------------
  await tryAsync(
    results,
    'web_checkout_submit_publishes',
    'checkout submit: публикует событие в broker и создаёт строку',
    async () => {
      const requestKey = `rk-submit-pub-${Date.now()}`

      let publishCalled = false
      let pingCalled = false

      _setRunAppFn(async (_ctx, _app, path) => {
        if (path === '/broker/publish') {
          publishCalled = true
          return { success: true }
        }
        if (path === '/broker/modules/register') {
          return { success: true }
        }
        if (path === '/broker/poll') {
          return { success: true, deliveries: [] }
        }
        if (path === '/checkout/process') {
          pingCalled = true
          return { success: true }
        }
        // scheduleJobAfter, /broker/ack, /broker/fail и прочее
        return { success: true }
      })

      try {
        const r = (await checkoutSubmitRoute.run(ctx, {
          requestKey,
          email: 'publish@example.com',
          amount: '9900',
          currency: 'RUB'
        })) as { success: boolean; status?: string; error?: string }

        if (!r.success) return false
        if (r.status !== 'submitted') return false

        const row = await checkoutRequestsRepo.findByRequestKey(ctx, requestKey)
        if (!row) return false
        if (row.status !== 'submitted') return false

        return publishCalled
      } finally {
        _resetRunAppFn()
      }
    }
  )

  // -------------------------------------------------------------------------
  // web_checkout_submit_idempotent
  // -------------------------------------------------------------------------
  await tryAsync(
    results,
    'web_checkout_submit_idempotent',
    'checkout submit: идемпотентность — два вызова, один publish',
    async () => {
      const requestKey = `rk-idem-${Date.now()}`

      let publishCount = 0

      _setRunAppFn(async (_ctx, _app, path) => {
        if (path === '/broker/publish') {
          publishCount++
          return { success: true }
        }
        if (path === '/broker/modules/register') return { success: true }
        if (path === '/broker/poll') return { success: true, deliveries: [] }
        return { success: true }
      })

      try {
        const r1 = (await checkoutSubmitRoute.run(ctx, {
          requestKey,
          email: 'idem@example.com',
          amount: '5000',
          currency: 'RUB'
        })) as { success: boolean }

        const r2 = (await checkoutSubmitRoute.run(ctx, {
          requestKey,
          email: 'idem@example.com',
          amount: '5000',
          currency: 'RUB'
        })) as { success: boolean }

        if (!r1.success || !r2.success) return false

        // Только одна публикация
        if (publishCount !== 1) return false

        // Строка одна
        const row = await checkoutRequestsRepo.findByRequestKey(ctx, requestKey)
        return row !== null
      } finally {
        _resetRunAppFn()
      }
    }
  )

  // -------------------------------------------------------------------------
  // web_checkout_process_saves_payment
  // -------------------------------------------------------------------------
  await tryAsync(
    results,
    'web_checkout_process_saves_payment',
    'checkout process: delivery getcourse.order.created → payment_ready + ack',
    async () => {
      const requestKey = `rk-proc-${Date.now()}`
      const idempotencyKey = buildIdempotencyKey(requestKey)
      const paymentUrl = `https://pay.link/test-${requestKey}`

      // Создаём строку submitted через upsert напрямую (надёжнее, чем вызов submit с моком)
      _setRunAppFn(async (_ctx, _app, path) => {
        if (path === '/broker/publish') return { success: true }
        if (path === '/broker/modules/register') return { success: true }
        if (path === '/broker/poll') return { success: true, deliveries: [] }
        return { success: true }
      })
      try {
        await checkoutSubmitRoute.run(ctx, {
          requestKey,
          email: 'proc@example.com',
          amount: '3000',
          currency: 'RUB'
        })
      } finally {
        _resetRunAppFn()
      }

      const delivery = makeDelivery(requestKey, idempotencyKey, paymentUrl, `d-proc-${requestKey}`)
      let ackCalled = false
      let pollCallCount = 0

      _setRunAppFn(async (_ctx, _app, path, body) => {
        if (path === '/broker/subscriptions/register') return { success: true }
        if (path === '/broker/modules/register') return { success: true }
        if (path === '/broker/poll') {
          pollCallCount++
          if (pollCallCount === 1) {
            return { success: true, deliveries: [delivery] }
          }
          return { success: true, deliveries: [] }
        }
        if (path === '/broker/ack') {
          const req = (body as Record<string, unknown>).request as Record<string, unknown>
          const items = req?.items as Array<{ deliveryId: string }> | undefined
          if (Array.isArray(items) && items.some((i) => i.deliveryId === delivery.deliveryId)) {
            ackCalled = true
          }
          return { success: true }
        }
        if (path === '/broker/fail') return { success: true }
        return { success: true }
      })

      try {
        await processOrderCreatedDeliveries(ctx, { limit: 10, maxBatches: 2 })

        const row = await checkoutRequestsRepo.findByRequestKey(ctx, requestKey)
        if (!row) return false
        if (row.status !== 'payment_ready') return false
        if (row.paymentUrl !== paymentUrl) return false
        return ackCalled
      } finally {
        _resetRunAppFn()
      }
    }
  )

  // -------------------------------------------------------------------------
  // web_checkout_orphan_not_acked
  // -------------------------------------------------------------------------
  await tryAsync(
    results,
    'web_checkout_orphan_not_acked',
    'checkout process: orphan delivery с неизвестным idempotencyKey → fail, не ack',
    async () => {
      const unknownIdempotencyKey = buildIdempotencyKey(`rk-orphan-unknown-${Date.now()}`)
      const paymentUrl = 'https://pay.link/orphan'
      const delivery = makeDelivery('rk-orphan', unknownIdempotencyKey, paymentUrl, 'd-orphan')

      let ackCalled = false
      let failCalled = false
      let pollCallCount = 0

      _setRunAppFn(async (_ctx, _app, path, body) => {
        if (path === '/broker/subscriptions/register') return { success: true }
        if (path === '/broker/modules/register') return { success: true }
        if (path === '/broker/poll') {
          pollCallCount++
          if (pollCallCount === 1) {
            return { success: true, deliveries: [delivery] }
          }
          return { success: true, deliveries: [] }
        }
        if (path === '/broker/ack') {
          const req = (body as Record<string, unknown>).request as Record<string, unknown>
          const items = req?.items as Array<{ deliveryId: string }> | undefined
          if (Array.isArray(items) && items.some((i) => i.deliveryId === 'd-orphan')) {
            ackCalled = true
          }
          return { success: true }
        }
        if (path === '/broker/fail') {
          const req = (body as Record<string, unknown>).request as Record<string, unknown>
          const items = req?.items as Array<{ deliveryId: string }> | undefined
          if (Array.isArray(items) && items.some((i) => i.deliveryId === 'd-orphan')) {
            failCalled = true
          }
          return { success: true }
        }
        return { success: true }
      })

      try {
        await processOrderCreatedDeliveries(ctx, { limit: 10, maxBatches: 2 })
        return failCalled && !ackCalled
      } finally {
        _resetRunAppFn()
      }
    }
  )

  // -------------------------------------------------------------------------
  // web_checkout_status_contract
  // -------------------------------------------------------------------------
  await tryAsync(
    results,
    'web_checkout_status_contract',
    'checkoutStatusRoute.run: контракт ответа {success, status, paymentUrl?}',
    async () => {
      const requestKey = `rk-status-${Date.now()}`

      _setRunAppFn(async (_ctx, _app, path) => {
        if (path === '/broker/subscriptions/register') return { success: true }
        if (path === '/broker/modules/register') return { success: true }
        if (path === '/broker/poll') return { success: true, deliveries: [] }
        return { success: true }
      })

      try {
        const r = (await checkoutStatusRoute.run(ctx, { requestKey })) as {
          success: boolean
          status: string
          paymentUrl?: string
        }

        return (
          typeof r.success === 'boolean' &&
          typeof r.status === 'string' &&
          (r.paymentUrl === undefined || typeof r.paymentUrl === 'string')
        )
      } finally {
        _resetRunAppFn()
      }
    }
  )

  return results
}
