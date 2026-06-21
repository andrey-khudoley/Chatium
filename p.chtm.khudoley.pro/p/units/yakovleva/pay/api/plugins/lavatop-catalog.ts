// @shared-route
import { requireAccountRole } from '@app/auth'
import { invokeByGateway } from '../../lib/gateway/invokeDispatcher'
import * as loggerLib from '../../lib/logger.lib'
import type {
  LavatopCatalogOffer,
  LavatopCatalogProduct,
  LavatopCatalogResponse
} from '../../shared/pluginManifestTypes'

const LOG_PATH = 'api/plugins/lavatop-catalog'
const MAX_PAGES = 30

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function readString(o: Record<string, unknown>, key: string): string {
  const value = o[key]
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOffer(raw: unknown): LavatopCatalogOffer | null {
  if (!isObject(raw)) return null
  const id = readString(raw, 'id')
  if (!id) return null
  const title = readString(raw, 'name') || readString(raw, 'title') || id
  return { id, title }
}

function readOffers(raw: unknown): LavatopCatalogOffer[] {
  if (!Array.isArray(raw)) return []
  const result: LavatopCatalogOffer[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const offer = normalizeOffer(item)
    if (!offer || seen.has(offer.id)) continue
    seen.add(offer.id)
    result.push(offer)
  }
  return result
}

function normalizeProduct(raw: unknown): LavatopCatalogProduct | null {
  if (!isObject(raw)) return null

  const nested = raw.data
  if (isObject(nested) && String(raw.type ?? '').toUpperCase() === 'PRODUCT') {
    const id = readString(nested, 'id')
    if (!id) return null
    return {
      id,
      title: readString(nested, 'title') || readString(nested, 'name') || id,
      offers: readOffers(nested.offers)
    }
  }

  const id = readString(raw, 'id')
  if (!id || raw.offers === undefined) return null
  return {
    id,
    title: readString(raw, 'title') || readString(raw, 'name') || id,
    offers: readOffers(raw.offers)
  }
}

function mergeProducts(acc: Map<string, LavatopCatalogProduct>, items: unknown[]): void {
  for (const item of items) {
    const product = normalizeProduct(item)
    if (!product) continue
    const existing = acc.get(product.id)
    if (!existing) {
      acc.set(product.id, product)
      continue
    }
    const offersById = new Map<string, LavatopCatalogOffer>()
    for (const offer of existing.offers) offersById.set(offer.id, offer)
    for (const offer of product.offers) offersById.set(offer.id, offer)
    existing.offers = [...offersById.values()]
  }
}

export const pluginLavatopCatalogRoute = app.get(
  '/',
  async (ctx): Promise<LavatopCatalogResponse> => {
    requireAccountRole(ctx, 'Admin')

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] entry`,
      payload: { maxPages: MAX_PAGES }
    })

    const products = new Map<string, LavatopCatalogProduct>()
    let nextPage = ''
    let pages = 0
    let requestId = ''

    try {
      while (pages < MAX_PAGES) {
        pages += 1
        const args = nextPage ? { nextPage } : {}
        const result = await invokeByGateway(ctx, 'lavatop', 'listProducts', args)
        requestId = result.requestId || requestId

        if (!result.ok) {
          const body = isObject(result.responseBody) ? result.responseBody : {}
          const error = isObject(body.error)
            ? String(body.error.message ?? body.error.code ?? 'Lava.Top catalog load failed')
            : 'Lava.Top catalog load failed'
          await loggerLib.writeServerLog(ctx, {
            severity: 4,
            message: `[${LOG_PATH}] gateway_error`,
            payload: { pages, httpStatus: result.httpStatus, requestId, error }
          })
          return { success: false, error, requestId }
        }

        const body = isObject(result.responseBody) ? result.responseBody : {}
        const data = isObject(body.data) ? body.data : {}
        const items = Array.isArray(data.items) ? data.items : []
        mergeProducts(products, items)

        const rawNextPage = data.nextPage
        nextPage = typeof rawNextPage === 'string' && rawNextPage.trim() ? rawNextPage.trim() : ''
        if (!nextPage) break
      }

      const sorted = [...products.values()]
        .map((product) => ({
          ...product,
          offers: [...product.offers].sort((a, b) => a.title.localeCompare(b.title, 'ru'))
        }))
        .sort((a, b) => a.title.localeCompare(b.title, 'ru'))

      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] success`,
        payload: { pages, productCount: sorted.length, requestId }
      })

      return { success: true, products: sorted, requestId, pages }
    } catch (e) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] exception`,
        payload: { error: String(e), pages, requestId }
      })
      return { success: false, error: String(e), requestId }
    }
  }
)

export default pluginLavatopCatalogRoute
