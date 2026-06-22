/**
 * Обработка доставок getcourse.order.created@1.
 * Корреляция ТОЛЬКО по event.payload.idempotencyKey — ядро не отдаёт correlationId в poll.
 * Drain-цикл: poll → handle → ack/fail.
 */

// @ts-ignore
import { runWithExclusiveLock } from '@app/sync'
import { sendDataToSocket } from '@app/socket'
import * as loggerLib from '../logger.lib'
import * as checkoutRequestsRepo from '../../repos/checkoutRequests.repo'
import {
  registerCoreBrokerSubscription,
  pollCoreBrokerDeliveries,
  ackCoreBrokerDeliveries,
  failCoreBrokerDeliveries,
  type ClaimedDelivery
} from '../broker/coreBrokerClient.lib'
import { buildSocketId } from './constants'
import { TERMINAL_STATUSES } from './constants'
import { buildPaymentReadyMessage } from './socketMessages.lib'

const LOG_MODULE = 'lib/checkout/processOrderCreated.lib'

// ---------------------------------------------------------------------------
// Тип извлечённых полей из payload getcourse.order.created
// ---------------------------------------------------------------------------

export type ExtractedOrderCreated = {
  idempotencyKey?: string
  orderKey?: string
  gcDealNumber?: string
  gcDealId?: string
  paymentUrl?: string
  userEmail?: string
}

// ---------------------------------------------------------------------------
// Терпимый парсер payload
// ---------------------------------------------------------------------------

function extractStr(obj: Record<string, unknown>, key: string): string | undefined {
  const val = obj[key]
  if (typeof val === 'string') {
    const t = val.trim()
    return t || undefined
  }
  return undefined
}

/**
 * Терпимый парсер: ищет поля в корне, nested payload/data/nested объектах.
 */
export function extractOrderCreatedPayload(payload: unknown): ExtractedOrderCreated {
  if (typeof payload !== 'object' || payload === null) return {}

  const root = payload as Record<string, unknown>

  const nested: Record<string, unknown> =
    (root.payload as Record<string, unknown> | null | undefined) ??
    (root.data as Record<string, unknown> | null | undefined) ??
    (root.nested as Record<string, unknown> | null | undefined) ??
    {}

  function get(key: string): string | undefined {
    return extractStr(root, key) ?? extractStr(nested, key)
  }

  return {
    idempotencyKey: get('idempotencyKey'),
    orderKey: get('orderKey'),
    gcDealNumber: get('gcDealNumber'),
    gcDealId: get('gcDealId'),
    paymentUrl: get('paymentUrl'),
    userEmail: get('userEmail')
  }
}

// ---------------------------------------------------------------------------
// Тип результата обработки одной доставки
// ---------------------------------------------------------------------------

export type HandleOrderCreatedResult =
  | { ok: true }
  | { ok: false; permanent: boolean; errorMessage: string }

// ---------------------------------------------------------------------------
// Обработка одной доставки
// ---------------------------------------------------------------------------

export async function handleOrderCreatedDelivery(
  ctx: app.Ctx,
  delivery: ClaimedDelivery
): Promise<HandleOrderCreatedResult> {
  const p = extractOrderCreatedPayload(delivery.event.payload)

  // (a) Payload невалиден: нет idempotencyKey ИЛИ нет paymentUrl → permanent (ack, лог warn)
  if (!p.idempotencyKey || !p.paymentUrl) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] handleOrderCreatedDelivery: невалидный payload — нет idempotencyKey или paymentUrl`,
      payload: {
        deliveryId: delivery.deliveryId,
        hasIdempotencyKey: !!p.idempotencyKey,
        hasPaymentUrl: !!p.paymentUrl
      }
    })
    return {
      ok: false,
      permanent: true,
      errorMessage: 'Невалидный payload: нет idempotencyKey или paymentUrl'
    }
  }

  // (b) Корреляция по payload.idempotencyKey
  const row = await checkoutRequestsRepo.findByIdempotencyKey(ctx, p.idempotencyKey)
  if (!row) {
    // ORPHAN — строки нет, не ack'аем: оставляем для повторной попытки
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] handleOrderCreatedDelivery: ORPHAN — строка не найдена по idempotencyKey`,
      payload: { deliveryId: delivery.deliveryId, idempotencyKey: p.idempotencyKey }
    })
    return {
      ok: false,
      permanent: false,
      errorMessage: `Orphan delivery: строка не найдена для idempotencyKey=${p.idempotencyKey}`
    }
  }

  const requestKey = row.requestKey
  const socketId = buildSocketId(requestKey)

  // (c) Под runWithExclusiveLock по socketId (единый ключ лока с submit)
  return runWithExclusiveLock(ctx, socketId, async (lockCtx: app.Ctx) => {
    // Перечитываем строку под локом
    const freshRow = await checkoutRequestsRepo.findByRequestKey(lockCtx, requestKey)
    if (!freshRow) {
      await loggerLib.writeServerLog(lockCtx, {
        severity: 4,
        message: `[${LOG_MODULE}] handleOrderCreatedDelivery: строка исчезла под локом`,
        payload: { requestKey, deliveryId: delivery.deliveryId }
      })
      return { ok: false, permanent: false, errorMessage: 'Строка исчезла под локом' }
    }

    // Терминальный статус — no-op
    if (TERMINAL_STATUSES.includes(freshRow.status)) {
      await loggerLib.writeServerLog(lockCtx, {
        severity: 6,
        message: `[${LOG_MODULE}] handleOrderCreatedDelivery: no-op — статус уже терминальный`,
        payload: { requestKey, status: freshRow.status }
      })
      return { ok: true }
    }

    // Upsert: status = payment_ready + paymentUrl + orderKey + gcDealNumber
    await checkoutRequestsRepo.upsert(lockCtx, {
      requestKey,
      status: 'payment_ready',
      paymentUrl: p.paymentUrl,
      orderKey: p.orderKey ?? '',
      gcDealNumber: p.gcDealNumber ?? ''
    })

    // Push в WebSocket (raw socketId — НЕ encoded)
    await sendDataToSocket(
      lockCtx,
      socketId,
      buildPaymentReadyMessage(requestKey, p.paymentUrl!, p.orderKey, p.gcDealNumber) as any
    )

    await loggerLib.writeServerLog(lockCtx, {
      severity: 6,
      message: `[${LOG_MODULE}] handleOrderCreatedDelivery: payment_ready сохранён + socket отправлен`,
      payload: { requestKey, orderKey: p.orderKey, gcDealNumber: p.gcDealNumber }
    })

    return { ok: true }
  })
}

// ---------------------------------------------------------------------------
// Drain-цикл poll → handle → ack/fail
// ---------------------------------------------------------------------------

export async function processOrderCreatedDeliveries(
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
    message: `[${LOG_MODULE}] processOrderCreatedDeliveries: вход`,
    payload: { limit, maxBatches }
  })

  // Гарантия cold-start: регистрируем подписку один раз до цикла
  try {
    await registerCoreBrokerSubscription(ctx)
  } catch (e) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] processOrderCreatedDeliveries: ошибка регистрации подписки`,
      payload: { error: e instanceof Error ? e.message : String(e) }
    })
    return { processed, failed, skipped }
  }

  for (let batch = 0; batch < maxBatches; batch++) {
    let deliveries: ClaimedDelivery[]
    try {
      const polled = await pollCoreBrokerDeliveries(ctx, limit)
      deliveries = polled.deliveries
    } catch (e) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] processOrderCreatedDeliveries: ошибка poll`,
        payload: { batch, error: e instanceof Error ? e.message : String(e) }
      })
      break
    }

    if (deliveries.length === 0) break

    const ackItems: Array<{ deliveryId: string; claimToken: string }> = []
    const failItems: Array<{ deliveryId: string; claimToken: string; error: unknown }> = []

    for (const d of deliveries) {
      try {
        const r = await handleOrderCreatedDelivery(ctx, d)
        if (r.ok) {
          processed++
          ackItems.push({ deliveryId: d.deliveryId, claimToken: d.claimToken })
        } else if (r.permanent) {
          // permanent:true — невалидный payload, ack (не возвращать в очередь)
          skipped++
          ackItems.push({ deliveryId: d.deliveryId, claimToken: d.claimToken })
        } else {
          // permanent:false — orphan или transient, fail (retry)
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
          message: `[${LOG_MODULE}] processOrderCreatedDeliveries: необработанная ошибка delivery`,
          payload: { deliveryId: d.deliveryId, error: errMsg }
        })
        failed++
        failItems.push({ deliveryId: d.deliveryId, claimToken: d.claimToken, error: errMsg })
      }
    }

    try {
      await ackCoreBrokerDeliveries(ctx, ackItems)
      await failCoreBrokerDeliveries(ctx, failItems)
    } catch (e) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] processOrderCreatedDeliveries: ошибка ack/fail`,
        payload: { error: e instanceof Error ? e.message : String(e) }
      })
    }

    // Очередь исчерпана
    if (deliveries.length < limit) break
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] processOrderCreatedDeliveries: итог`,
    payload: { processed, failed, skipped }
  })

  return { processed, failed, skipped }
}
