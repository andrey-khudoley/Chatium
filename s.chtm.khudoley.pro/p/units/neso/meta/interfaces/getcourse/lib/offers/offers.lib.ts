/**
 * Список офферов GetCourse: запрос через гейтвей + нормализация.
 */

import { callGetOffers, classifyGatewayError } from '../gateway/gcGatewayClient.lib'
import * as loggerLib from '../logger.lib'

const LOG_MODULE = 'lib/offers/offers.lib'

export type NormalizedOffer = {
  id: string
  title: string
  price: number
  finalPrice: number
  currency: string
  status: string
}

export function normalizeOffer(raw: unknown): NormalizedOffer | null {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const idRaw = r.id ?? r.offer_id ?? r.offerId ?? ''
  const id = String(idRaw)
  if (!id) return null

  const title = r.title ?? r.name ?? ''
  const priceRaw = Number(r.price ?? 0)
  const price = Number.isFinite(priceRaw) ? priceRaw : 0
  const finalPriceRaw = r.final_price !== undefined ? Number(r.final_price) : priceRaw
  const finalPrice = Number.isFinite(finalPriceRaw) ? finalPriceRaw : 0
  const currency = typeof r.currency === 'string' ? r.currency : ''
  const status = typeof r.status === 'string' ? r.status : ''

  return { id, title: String(title), price, finalPrice, currency, status }
}

export function extractOffers(data: unknown): NormalizedOffer[] {
  // Двойная обёртка: data.data (GC обёртывает массив офферов)
  const outer = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>
  const inner = outer.data ?? data
  const arr = Array.isArray(inner) ? inner : []
  return arr.map(normalizeOffer).filter((o): o is NormalizedOffer => o !== null)
}

export type FetchOffersResult =
  | { ok: true; offers: NormalizedOffer[] }
  | { ok: false; error: string }

export async function fetchOffers(ctx: app.Ctx): Promise<FetchOffersResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] fetchOffers: вход`,
    payload: {}
  })

  const result = await callGetOffers(ctx)

  if (!result.ok) {
    const errorMsg = classifyGatewayError(result.error)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] fetchOffers: ошибка гейтвея`,
      payload: { code: result.error.code, error: errorMsg }
    })
    return { ok: false, error: errorMsg }
  }

  const offers = extractOffers(result.data)

  if (offers.length === 0 && result.data) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] fetchOffers: аномалия формы ответа — data непустой, офферов нет`,
      payload: { op: 'getOffers' }
    })
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] fetchOffers: успех`,
    payload: { count: offers.length }
  })

  return { ok: true, offers }
}
