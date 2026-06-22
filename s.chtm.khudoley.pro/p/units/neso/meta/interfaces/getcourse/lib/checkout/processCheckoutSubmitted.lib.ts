/**
 * Обработка доставок web.checkout.submitted@1 из broker.
 * Парсинг payload, создание заказа через createOrder, drain-цикл poll/ack/fail.
 */

import * as loggerLib from '../logger.lib'
import { createOrder } from '../orders/orders.lib'
import {
  registerCoreBrokerSubscription,
  pollCoreBrokerDeliveries,
  ackCoreBrokerDeliveries,
  failCoreBrokerDeliveries
} from '../broker/coreBrokerClient.lib'

const LOG_MODULE = 'lib/checkout/processCheckoutSubmitted.lib'

// ---------------------------------------------------------------------------
// Тип извлечённых полей
// ---------------------------------------------------------------------------

export type ExtractedCheckout = {
  requestKey?: string
  idempotencyKey?: string
  email?: string
  amount?: number
  currency?: string
  offerId?: string
  firstName?: string
  lastName?: string
  phone?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
}

// ---------------------------------------------------------------------------
// Терпимый парсер payload
// ---------------------------------------------------------------------------

function extractStr(obj: Record<string, unknown>, key: string): string | undefined {
  const val = obj[key]
  if (typeof val === 'string') {
    const trimmed = val.trim()
    return trimmed || undefined
  }
  return undefined
}

export function extractCheckoutPayload(payload: unknown): ExtractedCheckout {
  if (typeof payload !== 'object' || payload === null) return {}

  const root = payload as Record<string, unknown>

  // Ищем поля в корне или в nested объектах payload/data/checkout
  const nested: Record<string, unknown> =
    (root.payload as Record<string, unknown> | null | undefined) ??
    (root.data as Record<string, unknown> | null | undefined) ??
    (root.checkout as Record<string, unknown> | null | undefined) ??
    {}

  function get(key: string): string | undefined {
    return extractStr(root, key) ?? extractStr(nested, key)
  }

  // amount — строку '9900' или число
  function getAmount(): number | undefined {
    const raw = root.amount ?? nested.amount
    if (raw === undefined || raw === null) return undefined
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }

  return {
    requestKey: get('requestKey'),
    idempotencyKey: get('idempotencyKey'),
    email: get('email'),
    amount: getAmount(),
    currency: get('currency'),
    offerId: get('offerId'),
    firstName: get('firstName'),
    lastName: get('lastName'),
    phone: get('phone'),
    utmSource: get('utmSource'),
    utmMedium: get('utmMedium'),
    utmCampaign: get('utmCampaign'),
    utmContent: get('utmContent'),
    utmTerm: get('utmTerm')
  }
}

// ---------------------------------------------------------------------------
// Обработка одного payload
// ---------------------------------------------------------------------------

export type HandleResult =
  | { ok: true; orderKey: string }
  | { ok: false; permanent: boolean; errorMessage: string }

export async function handleCheckoutSubmittedPayload(
  ctx: app.Ctx,
  payload: unknown
): Promise<HandleResult> {
  const c = extractCheckoutPayload(payload)

  // Проверка обязательных полей
  const hasRequestKey = !!c.requestKey
  const hasIdempotencyKey = !!c.idempotencyKey
  const hasEmail = !!c.email
  const hasAmount = typeof c.amount === 'number' && Number.isFinite(c.amount) && c.amount > 0
  const hasCurrency = !!c.currency

  if (!hasRequestKey || !hasIdempotencyKey || !hasEmail || !hasAmount || !hasCurrency) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] handleCheckoutSubmittedPayload: невалидный payload`,
      payload: { hasRequestKey, hasIdempotencyKey, hasEmail, hasAmount, hasCurrency }
    })
    return { ok: false, permanent: true, errorMessage: 'Невалидный payload web.checkout.submitted' }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] handleCheckoutSubmittedPayload: вход`,
    payload: {
      requestKey: c.requestKey,
      idempotencyKey: c.idempotencyKey,
      hasOffer: !!c.offerId
    }
  })

  const result = await createOrder(ctx, {
    idempotencyKey: c.idempotencyKey!,
    email: c.email!,
    amount: c.amount!,
    currency: c.currency!,
    offerId: c.offerId,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    utmSource: c.utmSource,
    utmMedium: c.utmMedium,
    utmCampaign: c.utmCampaign,
    utmContent: c.utmContent,
    utmTerm: c.utmTerm,
    correlationId: c.requestKey
  })

  if (result.success === true) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] handleCheckoutSubmittedPayload: заказ создан`,
      payload: { orderKey: result.orderKey }
    })
    return { ok: true, orderKey: result.orderKey }
  } else {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] handleCheckoutSubmittedPayload: ошибка createOrder`,
      payload: { errorMessage: result.errorMessage }
    })
    // Транзиентный сбой гейтвея — допускаем retry доставки
    return { ok: false, permanent: false, errorMessage: result.errorMessage }
  }
}

// ---------------------------------------------------------------------------
// Drain-цикл poll → handle → ack/fail
// ---------------------------------------------------------------------------

export async function processCheckoutSubmittedDeliveries(
  ctx: app.Ctx,
  opts: { limit?: number; maxBatches?: number } = {}
): Promise<{ processed: number; failed: number; skipped: number }> {
  const rawLimit = opts.limit
  const limit =
    typeof rawLimit === 'number' && Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.floor(rawLimit)
      : 10
  const maxBatches = opts.maxBatches ?? 5

  let processed = 0
  let failed = 0
  let skipped = 0

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] processCheckoutSubmittedDeliveries: вход`,
    payload: { limit, maxBatches }
  })

  // Гарантия cold-start (§6.2): регистрируем подписку один раз до цикла, а не на каждый poll.
  // При недоступности ядра — лог и выход (доставки доберутся следующим вызовом).
  try {
    await registerCoreBrokerSubscription(ctx)
  } catch (e) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] processCheckoutSubmittedDeliveries: ошибка регистрации подписки`,
      payload: { error: e instanceof Error ? e.message : String(e) }
    })
    return { processed, failed, skipped }
  }

  for (let batch = 0; batch < maxBatches; batch++) {
    let deliveries: Awaited<ReturnType<typeof pollCoreBrokerDeliveries>>['deliveries']
    try {
      const polled = await pollCoreBrokerDeliveries(ctx, limit)
      deliveries = polled.deliveries
    } catch (e) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] processCheckoutSubmittedDeliveries: ошибка poll`,
        payload: { batch, error: e instanceof Error ? e.message : String(e) }
      })
      break
    }

    if (deliveries.length === 0) break

    const ackItems: Array<{ deliveryId: string; claimToken: string }> = []
    const failItems: Array<{ deliveryId: string; claimToken: string; error: unknown }> = []

    for (const d of deliveries) {
      try {
        const r = await handleCheckoutSubmittedPayload(ctx, d.event.payload)
        if (r.ok) {
          processed++
          ackItems.push({ deliveryId: d.deliveryId, claimToken: d.claimToken })
        } else if (r.permanent) {
          skipped++
          ackItems.push({ deliveryId: d.deliveryId, claimToken: d.claimToken })
        } else {
          failed++
          failItems.push({
            deliveryId: d.deliveryId,
            claimToken: d.claimToken,
            error: r.errorMessage
          })
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e)
        await loggerLib.writeServerLog(ctx, {
          severity: 3,
          message: `[${LOG_MODULE}] processCheckoutSubmittedDeliveries: необработанная ошибка delivery`,
          payload: { deliveryId: d.deliveryId, error: errMsg }
        })
        failed++
        failItems.push({ deliveryId: d.deliveryId, claimToken: d.claimToken, error: errMsg })
      }
    }

    // Ошибка ack/fail не должна терять прогресс и рвать цикл: непрошедшие claim истекут
    // по ackTimeout и доставка вернётся (createOrder идемпотентен — дубля не будет).
    try {
      await ackCoreBrokerDeliveries(ctx, ackItems)
      await failCoreBrokerDeliveries(ctx, failItems)
    } catch (e) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] processCheckoutSubmittedDeliveries: ошибка ack/fail`,
        payload: { error: e instanceof Error ? e.message : String(e) }
      })
    }

    // Очередь исчерпана — poll вернул меньше чем запрашивали
    if (deliveries.length < limit) break
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] processCheckoutSubmittedDeliveries: итог`,
    payload: { processed, failed, skipped }
  })

  return { processed, failed, skipped }
}
