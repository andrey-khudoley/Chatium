/**
 * Обработка входящего postback от GetCourse.
 * Дедупликация по webhookId, корреляция, обновление статуса, публикация брокерных событий.
 */

// @ts-ignore
import { runWithExclusiveLock } from '@app/sync'

import * as ordersRepo from '../../repos/orders.repo'
import * as webhookEventsRepo from '../../repos/webhookEvents.repo'
import * as settingsLib from '../settings.lib'
import * as loggerLib from '../logger.lib'
import { isPayedTruthy, mapGcStatus } from '../orders/orderStatus.lib'
import { fromMoney } from '../orders/money.lib'
import { publishCoreBrokerEvent } from '../broker/coreBrokerClient.lib'

const LOG_MODULE = 'lib/webhook/processWebhook.lib'

// ---------------------------------------------------------------------------
// Вспомогательные функции (экспортируются для тестов)
// ---------------------------------------------------------------------------

export function extractDealFields(body: unknown): {
  dealId: string | undefined
  dealNumber: string | undefined
  gcStatus: string | undefined
  isPayedRaw: unknown
  statusUpdatedAt: string | undefined
} {
  if (typeof body !== 'object' || body === null) {
    return {
      dealId: undefined,
      dealNumber: undefined,
      gcStatus: undefined,
      isPayedRaw: undefined,
      statusUpdatedAt: undefined
    }
  }
  const b = body as Record<string, unknown>

  // Поля могут лежать в корне, в b.object или в b.deal
  const src: Record<string, unknown> = b
  const nested =
    (b.object as Record<string, unknown> | undefined) ??
    (b.deal as Record<string, unknown> | undefined) ??
    {}

  const dealId = src.id ?? src.deal_id ?? nested.id ?? nested.deal_id
  const dealNumber = src.number ?? src.deal_number ?? nested.number ?? nested.deal_number
  const gcStatus = src.status ?? nested.status
  const isPayedRaw = src.is_payed ?? nested.is_payed
  const statusUpdatedAt = src.status_updated_at ?? nested.status_updated_at

  return {
    dealId: dealId != null ? String(dealId) : undefined,
    dealNumber: dealNumber != null ? String(dealNumber) : undefined,
    gcStatus: gcStatus != null ? String(gcStatus) : undefined,
    isPayedRaw,
    statusUpdatedAt: statusUpdatedAt != null ? String(statusUpdatedAt) : undefined
  }
}

export function parseDatetimeToUnixMs(s: string | undefined): number {
  if (!s) return 0
  const ms = Date.parse(s)
  return isNaN(ms) ? 0 : ms
}

export function computeWebhookId(
  dealId: string | undefined,
  gcStatus: string | undefined,
  statusUpdatedAt: string | undefined
): string {
  return `${dealId ?? ''}:${gcStatus ?? ''}:${statusUpdatedAt ?? ''}`
}

// ---------------------------------------------------------------------------
// Основная функция обработки
// ---------------------------------------------------------------------------

export type ProcessWebhookResult = {
  status: number
  body: unknown
}

export async function processWebhook(ctx: app.Ctx, body: unknown): Promise<ProcessWebhookResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] processWebhook: вход`,
    payload: {}
  })

  const fields = extractDealFields(body)
  const { dealId, dealNumber, gcStatus, isPayedRaw, statusUpdatedAt } = fields

  // Нет deal_id и deal_number — не наш постбэк
  if (!dealId && !dealNumber) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] processWebhook: нет deal ref`,
      payload: {}
    })
    return { status: 200, body: { accepted: false, reason: 'no_deal_ref' } }
  }

  const isPayed = isPayedTruthy(isPayedRaw)
  const occurredAt = parseDatetimeToUnixMs(statusUpdatedAt)
  const webhookId = computeWebhookId(dealId, gcStatus, statusUpdatedAt)

  return runWithExclusiveLock(ctx, `gc-webhook:${webhookId}`, async (lockCtx: app.Ctx) => {
    // Дедупликация: проверяем processed
    const existingWebhook = await webhookEventsRepo.findByWebhookId(lockCtx, webhookId)
    if (existingWebhook?.processed) {
      await loggerLib.writeServerLog(lockCtx, {
        severity: 6,
        message: `[${LOG_MODULE}] processWebhook: дубль (уже обработан)`,
        payload: { webhookId }
      })
      return { status: 200, body: { accepted: true, reason: 'duplicate' } }
    }

    // Корреляция: находим заказ по dealId (приоритет) или dealNumber
    let order = dealId ? await ordersRepo.findByGcDealId(lockCtx, dealId) : null
    if (!order && dealNumber) {
      order = await ordersRepo.findByGcDealNumber(lockCtx, dealNumber)
    }

    if (!order) {
      // Записываем необработанный webhook (для аудита)
      await webhookEventsRepo.upsert(lockCtx, {
        webhookId,
        gcDealId: dealId ?? '',
        gcDealNumber: dealNumber ?? '',
        status: gcStatus ?? '',
        isPayed,
        payload: body,
        processed: false
      })
      await loggerLib.writeServerLog(lockCtx, {
        severity: 4,
        message: `[${LOG_MODULE}] processWebhook: заказ не найден`,
        payload: { dealId, dealNumber, webhookId }
      })
      return { status: 200, body: { accepted: false, reason: 'order_not_found' } }
    }

    const fromStatus = order.status
    const paidOverride = await settingsLib.getGcPaidStatus(lockCtx)
    const toStatus = mapGcStatus(gcStatus ?? '', isPayed, paidOverride)

    // idempotencyKey для status_changed включает webhookId (уникален per постбэк)
    const statusChangedKey = `getcourse-status:${order.orderKey}:${webhookId}`

    // Публикация status_changed
    await publishCoreBrokerEvent(lockCtx, {
      eventType: 'getcourse.order.status_changed',
      eventVersion: 1,
      occurredAt,
      idempotencyKey: statusChangedKey,
      payload: {
        orderKey: order.orderKey,
        gcDealId: order.gcDealId ?? dealId ?? '',
        gcDealNumber: order.gcDealNumber ?? dealNumber ?? '',
        fromStatus,
        toStatus,
        gcStatus: gcStatus ?? '',
        isPayed
      }
    })

    // Публикация paid ТОЛЬКО при переходе в paid
    if (fromStatus !== 'paid' && toStatus === 'paid') {
      const { amount: amountNum, currency } = fromMoney(order.amount)
      await loggerLib.writeServerLog(lockCtx, {
        severity: 6,
        message: `[${LOG_MODULE}] processWebhook: переход в paid`,
        payload: { orderKey: order.orderKey, amount: amountNum }
        // email не логируем
      })
      await publishCoreBrokerEvent(lockCtx, {
        eventType: 'getcourse.order.paid',
        eventVersion: 1,
        occurredAt,
        idempotencyKey: `getcourse-order-paid:${order.orderKey}`,
        payload: {
          orderKey: order.orderKey,
          gcDealId: order.gcDealId ?? dealId ?? '',
          gcDealNumber: order.gcDealNumber ?? dealNumber ?? '',
          userEmail: order.userEmail ?? '',
          amount: amountNum,
          currency
        }
      })
    }

    // Статус заказа и processed пишем ТОЛЬКО после успешной публикации:
    // при сбое publish статус не зафиксируется, и ретрай постбэка корректно
    // пересчитает fromStatus и переотправит status_changed/paid (идемпотентно по ключам).
    await ordersRepo.upsert(lockCtx, {
      orderKey: order.orderKey,
      status: toStatus,
      rawStatus: body
    })
    await webhookEventsRepo.upsert(lockCtx, {
      webhookId,
      orderKey: order.orderKey,
      gcDealId: order.gcDealId ?? dealId ?? '',
      gcDealNumber: order.gcDealNumber ?? dealNumber ?? '',
      status: gcStatus ?? '',
      isPayed,
      payload: body,
      processed: true
    })

    await loggerLib.writeServerLog(lockCtx, {
      severity: 6,
      message: `[${LOG_MODULE}] processWebhook: успех`,
      payload: {
        orderKey: order.orderKey,
        fromStatus,
        toStatus,
        webhookId
      }
    })

    return { status: 200, body: { accepted: true } }
  })
}
