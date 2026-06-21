/**
 * Обработка событий рефералов: регистрация, заказ, оплата.
 * Идемпотентность по campaignId+ref (регистрация) и campaignId+orderId (заказ/оплата).
 */

import * as attribution from '../core/attribution'
import * as visitRepo from './visitRepo'
import * as referralRepo from './referralRepo'
import * as partnerRepo from './partnerRepo'
import * as partnerNotify from '../telegram/partnerNotify'
// Вызовы partnerNotify.* обёрнуты в typeof === 'function': при старом деплое или ином бандле namespace может не содержать методов — тогда уведомление пропускается, обработка не падает.
import Registrations from '../../tables/registrations.table'
import Orders from '../../tables/orders.table'
import Payments from '../../tables/payments.table'

export interface ProcessRegistrationInput {
  ref: string
  tgId?: string
  gcId?: string
  name?: string
  email?: string
  phone?: string
  rawPayload: unknown
}

/**
 * Обработка события регистрации. Идемпотентность по campaignId + ref.
 */
export async function processRegistration(
  ctx: app.Ctx,
  campaignId: string,
  data: ProcessRegistrationInput
): Promise<{ success: boolean; isNew: boolean }> {
  const existing = await Registrations.findOneBy(ctx, {
    campaignId,
    ref: data.ref
  })
  if (existing) {
    return { success: true, isNew: false }
  }

  const resolved = await attribution.resolveByRef(ctx, data.ref)
  if (!resolved) {
    return { success: false, isNew: false }
  }

  await visitRepo.markVisitRegistered(ctx, data.ref)
  await referralRepo.createOrUpdateReferral(ctx, {
    campaignId: resolved.campaignId,
    partnerId: resolved.partnerId,
    ref: data.ref,
    tgId: data.tgId,
    gcId: data.gcId,
    name: data.name,
    email: data.email,
    phone: data.phone
  })
  await Registrations.create(ctx, {
    campaignId,
    ref: data.ref,
    tgId: data.tgId,
    gcId: data.gcId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    rawPayload: data.rawPayload
  })
  await partnerRepo.updatePartnerStats(ctx, resolved.partnerId, { registrations: 1 })
  if (typeof partnerNotify.notifyPartnerRegistration === 'function') {
    await partnerNotify.notifyPartnerRegistration(ctx, campaignId, resolved.partnerId, {
      ref: data.ref,
      name: data.name,
      email: data.email,
      phone: data.phone
    })
  }
  return { success: true, isNew: true }
}

export interface ProcessOrderInput {
  ref: string
  orderId: string
  productName: string
  orderSum: number
  rawPayload: unknown
}

/**
 * Обработка события заказа. Идемпотентность по campaignId + orderId.
 */
export async function processOrder(
  ctx: app.Ctx,
  campaignId: string,
  data: ProcessOrderInput
): Promise<{ success: boolean; isNew: boolean }> {
  const existing = await Orders.findOneBy(ctx, {
    campaignId,
    orderId: data.orderId
  })
  if (existing) {
    return { success: true, isNew: false }
  }

  const resolved = await attribution.resolveByRef(ctx, data.ref)
  if (!resolved) {
    return { success: false, isNew: false }
  }

  await Orders.create(ctx, {
    campaignId,
    ref: data.ref,
    orderId: data.orderId,
    productName: data.productName,
    orderSum: data.orderSum,
    rawPayload: data.rawPayload
  })
  await referralRepo.incrementReferralStats(ctx, campaignId, data.ref, {
    ordersCount: 1,
    ordersSum: data.orderSum
  })
  await partnerRepo.updatePartnerStats(ctx, resolved.partnerId, { orders: 1 })
  if (typeof partnerNotify.notifyPartnerOrder === 'function') {
    await partnerNotify.notifyPartnerOrder(ctx, campaignId, resolved.partnerId, {
      orderId: data.orderId,
      productName: data.productName,
      orderSum: data.orderSum
    })
  }
  return { success: true, isNew: true }
}

export interface ProcessPaymentInput {
  ref: string
  orderId: string
  paymentSum: number
  rawPayload: unknown
}

/**
 * Обработка события оплаты. Идемпотентность по campaignId + orderId (один платёж на заказ в прототипе).
 */
export async function processPayment(
  ctx: app.Ctx,
  campaignId: string,
  data: ProcessPaymentInput
): Promise<{ success: boolean; isNew: boolean }> {
  const existing = await Payments.findOneBy(ctx, {
    campaignId,
    orderId: data.orderId
  })
  if (existing) {
    return { success: true, isNew: false }
  }

  const resolved = await attribution.resolveByRef(ctx, data.ref)
  if (!resolved) {
    return { success: false, isNew: false }
  }

  await Payments.create(ctx, {
    campaignId,
    ref: data.ref,
    orderId: data.orderId,
    paymentSum: data.paymentSum,
    rawPayload: data.rawPayload
  })
  await referralRepo.incrementReferralStats(ctx, campaignId, data.ref, {
    paymentsCount: 1,
    paymentsSum: data.paymentSum
  })
  await partnerRepo.updatePartnerStats(ctx, resolved.partnerId, {
    payments: 1,
    paymentsSum: data.paymentSum
  })
  if (typeof partnerNotify.notifyPartnerPayment === 'function') {
    await partnerNotify.notifyPartnerPayment(ctx, campaignId, resolved.partnerId, {
      orderId: data.orderId,
      paymentSum: data.paymentSum
    })
  }
  return { success: true, isNew: true }
}

export type ReferralEventType = 'registration' | 'order' | 'payment'

export interface ReferralEventItem {
  type: ReferralEventType
  id: string
  at: string
  summary: string
  payload?: unknown
}

/**
 * Лог событий реферала: регистрация, заказы, оплаты по campaignId и ref.
 * События сортируются по дате (createdAt или id).
 */
export async function getReferralEventLog(
  ctx: app.Ctx,
  campaignId: string,
  ref: string
): Promise<ReferralEventItem[]> {
  const [reg, orders, payments] = await Promise.all([
    Registrations.findOneBy(ctx, { campaignId, ref }),
    Orders.findAll(ctx, { where: { campaignId, ref }, limit: 200 }),
    Payments.findAll(ctx, { where: { campaignId, ref }, limit: 200 })
  ])
  const events: ReferralEventItem[] = []
  const rowWithCreated = (r: { id: string; createdAt?: string | Date }) => {
    const c = (r as { createdAt?: string | Date }).createdAt
    if (c instanceof Date) return c.toISOString()
    if (typeof c === 'string') return c
    return r.id
  }
  if (reg) {
    events.push({
      type: 'registration',
      id: reg.id,
      at: rowWithCreated(reg),
      summary: 'Регистрация',
      payload: (reg as unknown as { rawPayload?: unknown }).rawPayload
    })
  }
  for (const o of orders) {
    const order = o as unknown as {
      id: string
      createdAt?: string | Date
      productName?: string
      orderSum?: number
      rawPayload?: unknown
    }
    events.push({
      type: 'order',
      id: order.id,
      at: rowWithCreated(o),
      summary: `Заказ: ${order.productName ?? '—'} — ${formatMoney(order.orderSum ?? 0)}`,
      payload: order.rawPayload
    })
  }
  for (const p of payments) {
    const pay = p as unknown as {
      id: string
      createdAt?: string | Date
      orderId?: string
      paymentSum?: number
      rawPayload?: unknown
    }
    events.push({
      type: 'payment',
      id: pay.id,
      at: rowWithCreated(p),
      summary: `Оплата по заказу ${pay.orderId ?? '—'}: ${formatMoney(pay.paymentSum ?? 0)}`,
      payload: pay.rawPayload
    })
  }
  events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
  return events
}

function formatMoney(kopecks: number): string {
  if (kopecks === 0) return '0 ₽'
  const rub = (kopecks / 100).toFixed(2)
  return `${rub} ₽`
}
