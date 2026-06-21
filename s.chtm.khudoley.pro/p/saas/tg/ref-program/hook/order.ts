/**
 * Webhook заказа от внешней системы.
 * GET/POST /p/saas/ref/hook/order — параметры key, ref, order_id/orderId, product_name/productName, order_sum/orderSum.
 * productName может быть строкой или массивом объектов с полем title (берётся первый или склейка через запятую).
 * order_sum по умолчанию в рублях (конвертируется в копейки); при order_sum_in_kopecks/orderSumInKopecks: true — уже в копейках.
 */

import * as pageRepo from '../lib/repo/pageRepo'
import * as eventRepo from '../lib/repo/eventRepo'

export const orderWebhookGetRoute = app.get('/', async (ctx, req) => {
  return handleOrderWebhook(ctx, (req.query ?? {}) as Record<string, unknown>)
})

export const orderWebhookPostRoute = app.post('/', async (ctx, req) => {
  const data = {
    ...((req.query ?? {}) as Record<string, unknown>),
    ...((req.body ?? {}) as Record<string, unknown>)
  }
  return handleOrderWebhook(ctx, data)
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

/** Приводит сумму из рублей в копейки (умножает на 100). Webhook по умолчанию принимает order_sum в рублях. */
function toKopecks(value: number): number {
  return Math.round(value * 100)
}

/**
 * Извлекает строку названия продукта из входящего значения.
 * Поддерживает: строку, массив объектов с полем title (берётся первый title или склейка через запятую).
 */
function normalizeProductName(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    const titles = value
      .map((item) =>
        item && typeof item === 'object' && 'title' in item
          ? String((item as { title: unknown }).title)
          : null
      )
      .filter((t): t is string => t != null && t.trim() !== '')
    return titles.length > 0 ? titles.join(', ') : ''
  }
  return ''
}

async function handleOrderWebhook(
  ctx: app.Ctx,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const key = data.key
  const ref = data.ref
  const orderId = data.order_id ?? data.orderId
  const rawProductName = data.product_name ?? data.productName
  const productName = normalizeProductName(rawProductName)
  const rawOrderSum = parseNumber(data.order_sum ?? data.orderSum)
  const orderSumInKopecks = data.order_sum_in_kopecks === true || data.orderSumInKopecks === true
  const orderSum =
    rawOrderSum !== undefined
      ? orderSumInKopecks
        ? Math.round(rawOrderSum)
        : toKopecks(rawOrderSum)
      : undefined

  ctx.account.log('Order webhook received', {
    level: 'info',
    json: { key, ref, orderId, productName, orderSum }
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
  if (orderSum === undefined || orderSum < 0) {
    return { success: false, error: 'Missing or invalid order_sum parameter' }
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
    const result = await eventRepo.processOrder(ctx, campaignId, {
      ref: ref as string,
      orderId,
      productName,
      orderSum,
      rawPayload: { ...data, receivedAt: new Date().toISOString() }
    })

    ctx.account.log('Order processed', {
      level: 'info',
      json: { campaignId, ref, orderId, isNew: result.isNew }
    })

    if (!result.success) {
      return { success: false, error: 'Ref not found or order already processed' }
    }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    ctx.account.log('Order processing error', {
      level: 'error',
      json: { campaignId, ref, orderId, error: message }
    })
    return { success: false, error: 'Processing error' }
  }
}
