/**
 * Webhook оплаты от внешней системы.
 * GET/POST /p/saas/ref/hook/payment — параметры key, ref, order_id, payment_sum.
 */

import * as pageRepo from '../lib/repo/pageRepo'
import * as eventRepo from '../lib/repo/eventRepo'

export const paymentWebhookGetRoute = app.get('/', async (ctx, req) => {
  return handlePaymentWebhook(ctx, (req.query ?? {}) as Record<string, unknown>)
})

export const paymentWebhookPostRoute = app.post('/', async (ctx, req) => {
  const data = {
    ...((req.query ?? {}) as Record<string, unknown>),
    ...((req.body ?? {}) as Record<string, unknown>)
  }
  return handlePaymentWebhook(ctx, data)
})

function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isNaN(n) ? undefined : n
  }
  return undefined
}

/** Приводит сумму из рублей в копейки (умножает на 100). Webhook принимает payment_sum в рублях. */
function toKopecks(value: number): number {
  return Math.round(value * 100)
}

async function handlePaymentWebhook(
  ctx: app.Ctx,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const key = data.key
  const ref = data.ref
  const orderId = data.order_id ?? data.orderId
  const rawPaymentSum = parseNumber(data.payment_sum ?? data.paymentSum)
  const paymentSum = rawPaymentSum !== undefined ? toKopecks(rawPaymentSum) : undefined

  ctx.account.log('Payment webhook received', {
    level: 'info',
    json: { key, ref, orderId, paymentSum }
  })

  if (!key || typeof key !== 'string') {
    return { success: false, error: 'Missing key parameter' }
  }
  if (!ref || typeof ref !== 'string') {
    return { success: false, error: 'Missing ref parameter' }
  }
  if (!orderId || typeof orderId !== 'string') {
    return { success: false, error: 'Missing order_id parameter' }
  }
  if (paymentSum === undefined || paymentSum < 0) {
    return { success: false, error: 'Missing or invalid payment_sum parameter' }
  }

  const page = await pageRepo.findPageBySecret(ctx, key)
  if (!page) {
    ctx.account.log('Page not found by secret', {
      level: 'warn',
      json: { key }
    })
    return { success: false, error: 'Invalid key' }
  }

  const campaignId = page.campaignId?.id
  if (!campaignId) {
    ctx.account.log('Page has no campaign', { level: 'warn', json: { pageId: page.id } })
    return { success: false, error: 'Invalid key' }
  }

  try {
    const result = await eventRepo.processPayment(ctx, campaignId, {
      ref: ref as string,
      orderId,
      paymentSum,
      rawPayload: { ...data, receivedAt: new Date().toISOString() }
    })

    ctx.account.log('Payment processed', {
      level: 'info',
      json: { campaignId, ref, orderId, isNew: result.isNew }
    })

    if (!result.success) {
      return { success: false, error: 'Ref not found or payment already processed' }
    }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    ctx.account.log('Payment processing error', {
      level: 'error',
      json: { campaignId, ref, orderId, error: message }
    })
    return { success: false, error: 'Processing error' }
  }
}
