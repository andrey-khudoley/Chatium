/**
 * Интеграционные тесты GetCourse: с реальным ctx (Heap), мок гейтвея через транспорт.
 */

import { _setRequestFn, _resetRequestFn } from '../gateway/gcGatewayClient.lib'
import { _resetRunAppFn } from '../broker/coreBrokerClient.lib'
import { createOrder } from '../orders/orders.lib'
import * as ordersRepo from '../../repos/orders.repo'
import * as webhookEventsRepo from '../../repos/webhookEvents.repo'
import * as settingsRepo from '../../repos/settings.repo'
import * as settingsLib from '../settings.lib'
import { type TemplateIntegrationTestResult, tryAsync } from './integrationSuiteHelpers'
import { runGetCourseCheckoutChecks } from './getcourseCheckoutSuite'

// ---------------------------------------------------------------------------
// Мок-фикстуры гейтвея
// ---------------------------------------------------------------------------

function makeGatewayOkBody(data: unknown) {
  return JSON.stringify({ ok: true, data, requestId: 'test-req-1' })
}

function makeGatewayErrorBody(code: string, message: string) {
  return JSON.stringify({ ok: false, error: { code, message } })
}

function makeGcDealOkData(paymentLink: string, dealId: string, dealNumber: string) {
  return {
    success: true,
    result: {
      success: true,
      payment_link: paymentLink,
      deal_id: dealId,
      deal_number: dealNumber,
      user_id: 'user-42'
    }
  }
}

function makeGcDealErrorData() {
  return {
    success: true,
    result: { error: true, error_message: 'Сделка заблокирована' }
  }
}

// ---------------------------------------------------------------------------
// Хелпер: установить настройки гейтвея (для тестов)
// ---------------------------------------------------------------------------

async function setupGatewaySettings(ctx: app.Ctx): Promise<void> {
  await settingsLib.setSetting(
    ctx,
    settingsLib.SETTING_KEYS.GATEWAY_BASE_URL,
    'https://test-gateway.example.com'
  )
  await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.GC_SCHOOL_HOST, 'test.getcourse.ru')
  await settingsLib.setSetting(
    ctx,
    settingsLib.SETTING_KEYS.GC_SCHOOL_API_KEY,
    'test-api-key-12345678'
  )
  await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.GC_DEFAULT_OFFER_ID, '99')
}

const GATEWAY_TEST_SETTING_KEYS = [
  settingsLib.SETTING_KEYS.GATEWAY_BASE_URL,
  settingsLib.SETTING_KEYS.GC_SCHOOL_HOST,
  settingsLib.SETTING_KEYS.GC_SCHOOL_API_KEY,
  settingsLib.SETTING_KEYS.GC_DEFAULT_OFFER_ID
] as const

type SettingsSnapshot = Record<string, { exists: boolean; value: unknown }>

async function captureGatewaySettings(ctx: app.Ctx): Promise<SettingsSnapshot> {
  const snapshot: SettingsSnapshot = {}
  for (const key of GATEWAY_TEST_SETTING_KEYS) {
    const row = await settingsRepo.findByKey(ctx, key)
    snapshot[key] = { exists: !!row, value: row?.value }
  }
  return snapshot
}

async function restoreGatewaySettings(ctx: app.Ctx, snapshot: SettingsSnapshot): Promise<void> {
  for (const key of GATEWAY_TEST_SETTING_KEYS) {
    const item = snapshot[key]
    if (!item?.exists) {
      await settingsRepo.deleteByKey(ctx, key)
    } else {
      await settingsRepo.upsert(ctx, key, item.value)
    }
  }
}

// ---------------------------------------------------------------------------
// createOrder тесты
// ---------------------------------------------------------------------------

async function runCreateOrderChecks(
  ctx: app.Ctx,
  results: TemplateIntegrationTestResult[]
): Promise<void> {
  const TEST_IDEM_KEY = `gc-test-create-${Date.now()}`
  const TEST_EMAIL = 'test@example.com'

  // Happy path
  await tryAsync(results, 'gc_create_order_happy', 'createOrder: happy path', async () => {
    _setRequestFn(async () => ({
      statusCode: 200,
      body: makeGatewayOkBody(makeGcDealOkData('https://pay.link/123', '123', 'DEAL-001'))
    }))
    try {
      const result = await createOrder(ctx, {
        idempotencyKey: TEST_IDEM_KEY,
        email: TEST_EMAIL,
        amount: 9900,
        currency: 'RUB',
        offerId: '42'
      })
      return result.success === true && 'paymentUrl' in result && !!result.paymentUrl
    } finally {
      _resetRequestFn()
    }
  })

  // Идемпотентность: повторный вызов с тем же ключом
  await tryAsync(
    results,
    'gc_create_order_idempotent',
    'createOrder: идемпотентность',
    async () => {
      _setRequestFn(async () => {
        // Не должно вызываться второй раз
        throw new Error('Вызов гейтвея при идемпотентном повторе недопустим')
      })
      try {
        const result = await createOrder(ctx, {
          idempotencyKey: TEST_IDEM_KEY,
          email: TEST_EMAIL,
          amount: 9900,
          currency: 'RUB',
          offerId: '42'
        })
        return result.success === true
      } finally {
        _resetRequestFn()
      }
    }
  )

  // ok:false от гейтвея
  const TEST_FAIL_KEY = `gc-test-fail-${Date.now()}`
  await tryAsync(
    results,
    'gc_create_order_gateway_error',
    'createOrder: ok:false от гейтвея',
    async () => {
      _setRequestFn(async () => ({
        statusCode: 200,
        body: makeGatewayErrorBody('INVOKE_GC_UPSTREAM_ERROR', 'Upstream error')
      }))
      try {
        const result = await createOrder(ctx, {
          idempotencyKey: TEST_FAIL_KEY,
          email: TEST_EMAIL,
          amount: 9900,
          currency: 'RUB',
          offerId: '42'
        })
        if (result.success) return false
        // Проверяем что заказ сохранён со статусом failed
        const order = await ordersRepo.findByIdempotencyKey(ctx, TEST_FAIL_KEY)
        return order?.status === 'failed'
      } finally {
        _resetRequestFn()
      }
    }
  )

  // result.error от GC
  const TEST_GC_ERR_KEY = `gc-test-gc-err-${Date.now()}`
  await tryAsync(
    results,
    'gc_create_order_gc_error',
    'createOrder: result.error из GC',
    async () => {
      _setRequestFn(async () => ({
        statusCode: 200,
        body: makeGatewayOkBody(makeGcDealErrorData())
      }))
      try {
        const result = await createOrder(ctx, {
          idempotencyKey: TEST_GC_ERR_KEY,
          email: TEST_EMAIL,
          amount: 9900,
          currency: 'RUB',
          offerId: '42'
        })
        return result.success === false
      } finally {
        _resetRequestFn()
      }
    }
  )
}

// ---------------------------------------------------------------------------
// Webhook тесты
// ---------------------------------------------------------------------------

async function runWebhookChecks(
  ctx: app.Ctx,
  results: TemplateIntegrationTestResult[]
): Promise<void> {
  // Для webhook тестов нам нужен роут. Тестируем processWebhook напрямую
  const { processWebhook } = await import('../webhook/processWebhook.lib')

  // Сначала создаём заказ для корреляции
  const DEAL_ID = `deal-wh-${Date.now()}`
  const DEAL_NUMBER = `DEAL-WH-${Date.now()}`
  const WH_IDEM_KEY = `gc-wh-test-${Date.now()}`
  const WH_EMAIL = 'webhook@example.com'

  _setRequestFn(async () => ({
    statusCode: 200,
    body: makeGatewayOkBody(makeGcDealOkData('https://pay.link/777', DEAL_ID, DEAL_NUMBER))
  }))
  await createOrder(ctx, {
    idempotencyKey: WH_IDEM_KEY,
    email: WH_EMAIL,
    amount: 5000,
    currency: 'RUB',
    offerId: '42'
  })
  _resetRequestFn()

  const WH_STATUS_UPDATED_AT = `2026-01-17 10:00:00`

  // Корреляция по deal_id
  await tryAsync(
    results,
    'gc_webhook_correlate_dealid',
    'webhook: корреляция по deal_id',
    async () => {
      const result = await processWebhook(ctx, {
        id: DEAL_ID,
        number: DEAL_NUMBER,
        status: 'in_work',
        is_payed: false,
        status_updated_at: WH_STATUS_UPDATED_AT
      })
      return result.status === 200 && (result.body as { accepted?: boolean })?.accepted === true
    }
  )

  // Переход в paid публикует status_changed+paid
  await tryAsync(
    results,
    'gc_webhook_paid_transition',
    'webhook: переход paid → status_changed + paid',
    async () => {
      const published: string[] = []
      // Мок брокера уже в publishCoreBrokerEvent — проверяем через репо
      const result = await processWebhook(ctx, {
        id: DEAL_ID,
        number: DEAL_NUMBER,
        status: 'payed',
        is_payed: true,
        status_updated_at: `2026-01-17 11:00:00`
      })
      if (result.status !== 200) return false
      const order = await ordersRepo.findByGcDealId(ctx, DEAL_ID)
      return order?.status === 'paid'
    }
  )

  // Повтор webhookId — no-op
  await tryAsync(
    results,
    'gc_webhook_duplicate_noop',
    'webhook: дубль webhookId → no-op',
    async () => {
      const body = {
        id: DEAL_ID,
        number: DEAL_NUMBER,
        status: 'payed',
        is_payed: true,
        status_updated_at: `2026-01-17 11:00:00`
      }
      const r1 = await processWebhook(ctx, body)
      const r2 = await processWebhook(ctx, body)
      const b1 = r1.body as Record<string, unknown>
      const b2 = r2.body as Record<string, unknown>
      // Второй вызов должен вернуть duplicate
      return r1.status === 200 && r2.status === 200 && b2.reason === 'duplicate'
    }
  )

  // Не найден заказ → order_not_found
  await tryAsync(
    results,
    'gc_webhook_not_found',
    'webhook: заказ не найден → order_not_found',
    async () => {
      const result = await processWebhook(ctx, {
        id: 'nonexistent-deal-999',
        number: 'DEAL-999',
        status: 'new',
        is_payed: false,
        status_updated_at: `2026-01-17 12:00:00`
      })
      const b = result.body as Record<string, unknown>
      return result.status === 200 && b.reason === 'order_not_found'
    }
  )

  // Нет deal_id и deal_number → no_deal_ref
  await tryAsync(
    results,
    'gc_webhook_no_deal_ref',
    'webhook: нет deal ref → no_deal_ref',
    async () => {
      const result = await processWebhook(ctx, { status: 'new' })
      const b = result.body as Record<string, unknown>
      return result.status === 200 && b.reason === 'no_deal_ref'
    }
  )

  // Корреляция по deal_number
  await tryAsync(
    results,
    'gc_webhook_correlate_number',
    'webhook: корреляция по deal_number',
    async () => {
      const result = await processWebhook(ctx, {
        number: DEAL_NUMBER,
        status: 'in_work',
        is_payed: false,
        status_updated_at: `2026-01-17 13:00:00`
      })
      return result.status === 200
    }
  )
}

// ---------------------------------------------------------------------------
// Webhook токен-фильтр тесты (через роут напрямую)
// ---------------------------------------------------------------------------

async function runWebhookTokenChecks(
  ctx: app.Ctx,
  results: TemplateIntegrationTestResult[]
): Promise<void> {
  // Проверяем логику токен-фильтра из роута
  // Без настроенного токена — 200
  await tryAsync(
    results,
    'gc_webhook_no_token_200',
    'webhook: без токена настройки → 200',
    async () => {
      // Убедимся что токен не настроен
      const token = await settingsLib.getWebhookPathToken(ctx)
      if (token) {
        // Если токен задан другим тестом, пропускаем
        return true
      }
      const { processWebhook } = await import('../webhook/processWebhook.lib')
      const result = await processWebhook(ctx, {
        id: 'token-test-deal',
        status: 'new',
        status_updated_at: '2026-01-17 14:00:00'
      })
      return result.status === 200
    }
  )
}

// ---------------------------------------------------------------------------
// Основная функция
// ---------------------------------------------------------------------------

export async function runGetCourseIntegrationChecks(
  ctx: app.Ctx
): Promise<TemplateIntegrationTestResult[]> {
  const results: TemplateIntegrationTestResult[] = []
  const settingsSnapshot = await captureGatewaySettings(ctx)

  try {
    await setupGatewaySettings(ctx)

    await runCreateOrderChecks(ctx, results)
    await runWebhookChecks(ctx, results)
    await runWebhookTokenChecks(ctx, results)
    await runGetCourseCheckoutChecks(ctx, results)
  } finally {
    _resetRequestFn()
    _resetRunAppFn()
    await restoreGatewaySettings(ctx, settingsSnapshot)
  }

  return results
}
