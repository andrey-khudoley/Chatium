import { request } from '@app/request'
import { normalizeLavaBaseUrlInput } from '../shared/lavaBaseUrl'
import type { LavaCurrency } from './lava-types'
import * as loggerLib from './logger.lib'
import * as settingsLib from './settings.lib'

const LOG_MODULE = 'lib/lava-api.client'

/** JSON для лога (обрезка, чтобы не раздувать Heap). */
function jsonForLog(value: unknown, maxLen = 24000): string {
  try {
    const s = JSON.stringify(value)
    if (s.length <= maxLen) return s
    return `${s.slice(0, maxLen)}… [truncated, total ${s.length} chars]`
  } catch {
    return String(value)
  }
}

function httpErrorSnippet(body: unknown): string {
  if (typeof body === 'string') return body.slice(0, 400)
  try {
    return JSON.stringify(body).slice(0, 400)
  } catch {
    return String(body).slice(0, 400)
  }
}

export type CreateContractParams = {
  email: string
  currency: LavaCurrency
  paymentProvider?: string
  paymentMethod?: string
  buyerLanguage?: string
  clientUtm?: Record<string, unknown>
}

/**
 * PATCH /api/v2/products/{productId} — обновить цену оффера (шаблонный продукт).
 */
export async function updateOfferPrice(
  ctx: app.Ctx,
  params: { amount: number; currency: LavaCurrency; offerDisplayName?: string }
): Promise<unknown> {
  const baseUrl = normalizeLavaBaseUrlInput(await settingsLib.getLavaBaseUrl(ctx))
  const apiKey = (await settingsLib.getLavaApiKey(ctx)).trim()
  const productId = (await settingsLib.getLavaProductId(ctx)).trim()
  const offerId = (await settingsLib.getLavaOfferId(ctx)).trim()

  if (!apiKey || !productId || !offerId) {
    const err = new Error('Lava: в настройках должны быть заданы API-ключ, product_id и offer_id')
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] updateOfferPrice: ветка ошибки конфигурации`,
      payload: {
        hasApiKey: Boolean(apiKey),
        hasProductId: Boolean(productId),
        hasOfferId: Boolean(offerId)
      }
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] updateOfferPrice: конфигурация неполная`,
      payload: { hasApiKey: Boolean(apiKey), productId, offerId }
    })
    throw err
  }

  const url = `${baseUrl}/api/v2/products/${encodeURIComponent(productId)}`
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] updateOfferPrice: PATCH запрос`,
    payload: {
      url,
      productId,
      offerId,
      amount: params.amount,
      currency: params.currency
    }
  })
  const response = await request({
    url,
    method: 'patch',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    json: {
      offers: [
        {
          id: offerId,
          ...(params.offerDisplayName != null && params.offerDisplayName.length > 0
            ? { name: params.offerDisplayName }
            : {}),
          prices: [{ amount: params.amount, currency: params.currency }]
        }
      ]
    },
    responseType: 'json',
    throwHttpErrors: false,
    timeout: 15000
  })

  if (response.statusCode !== 200) {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] updateOfferPrice: ветка HTTP ≠ 200`,
      payload: { statusCode: response.statusCode, url }
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] updateOfferPrice: ошибка Lava`,
      payload: {
        url,
        statusCode: response.statusCode,
        body: jsonForLog(response.body, 8000)
      }
    })
    throw new Error(
      `Lava PATCH product: HTTP ${response.statusCode}: ${httpErrorSnippet(response.body)}`
    )
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] updateOfferPrice: HTTP 200`,
    payload: { productId, offerId, statusCode: response.statusCode }
  })

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] updateOfferPrice: успех`,
    payload: { productId, offerId, amount: params.amount, currency: params.currency }
  })

  return response.body
}

/**
 * POST /api/v3/invoice — создать счёт (контракт) и получить ссылку на оплату.
 */
export async function createContract(
  ctx: app.Ctx,
  params: CreateContractParams
): Promise<{ contractId: string; paymentUrl: string; status: string }> {
  const baseUrl = normalizeLavaBaseUrlInput(await settingsLib.getLavaBaseUrl(ctx))
  const apiKey = (await settingsLib.getLavaApiKey(ctx)).trim()
  const offerId = (await settingsLib.getLavaOfferId(ctx)).trim()

  if (!apiKey || !offerId) {
    const err = new Error('Lava: в настройках должны быть заданы API-ключ и offer_id')
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] createContract: ветка ошибки конфигурации`,
      payload: { hasApiKey: Boolean(apiKey), hasOfferId: Boolean(offerId) }
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] createContract: конфигурация неполная`,
      payload: { hasApiKey: Boolean(apiKey), offerId }
    })
    throw err
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] createContract: POST /api/v3/invoice`,
    payload: {
      offerId,
      currency: params.currency,
      hasEmail: Boolean(params.email),
      hasUtm: Boolean(params.clientUtm && Object.keys(params.clientUtm).length)
    }
  })

  const body: Record<string, unknown> = {
    email: params.email,
    offerId,
    currency: params.currency
  }
  if (params.paymentProvider) body.paymentProvider = params.paymentProvider
  if (params.paymentMethod) body.paymentMethod = params.paymentMethod
  if (params.buyerLanguage) body.buyerLanguage = params.buyerLanguage
  if (params.clientUtm && typeof params.clientUtm === 'object') body.clientUtm = params.clientUtm

  const emailValue = String(body.email ?? '')
  const emailCharCodes = Array.from(emailValue).map((char) => char.charCodeAt(0))

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] createContract: RAW request payload`,
    payload: {
      invoiceUrl: `${baseUrl}/api/v3/invoice`,
      body,
      emailRaw: emailValue,
      emailLowercase: emailValue.toLowerCase(),
      emailLength: emailValue.length,
      emailCharCodes
    }
  })

  const response = await request({
    url: `${baseUrl}/api/v3/invoice`,
    method: 'post',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    json: body,
    responseType: 'json',
    throwHttpErrors: false,
    timeout: 15000
  })

  if (response.statusCode !== 201) {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] createContract: ветка HTTP ≠ 201`,
      payload: { statusCode: response.statusCode }
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] createContract: ошибка Lava`,
      payload: {
        statusCode: response.statusCode,
        body: jsonForLog(response.body, 8000)
      }
    })
    throw new Error(
      `Lava POST invoice: HTTP ${response.statusCode}: ${httpErrorSnippet(response.body)}`
    )
  }

  const b = response.body as Record<string, unknown>
  const contractId = String(b.id ?? b.contractId ?? '')
  const paymentUrl = String(b.paymentUrl ?? b.payment_url ?? '')
  const status = String(b.status ?? '')

  if (!contractId || !paymentUrl) {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] createContract: ветка нет id/paymentUrl в теле`,
      payload: { hasContractId: Boolean(contractId), hasPaymentUrl: Boolean(paymentUrl) }
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] createContract: неожиданное тело ответа`,
      payload: { body: jsonForLog(response.body, 8000) }
    })
    throw new Error('Lava POST invoice: в ответе нет id или paymentUrl')
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] createContract: разбор ответа OK`,
    payload: { contractId, status }
  })

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] createContract: успех`,
    payload: { contractId, status }
  })

  return { contractId, paymentUrl, status }
}

/**
 * GET /api/v2/products — первая страница каталога (явные ключ и URL, без чтения Heap).
 */
export async function fetchLavaProductsFirstPage(
  ctx: app.Ctx,
  params: { apiKey: string; baseUrl: string }
): Promise<{ statusCode: number; body: unknown }> {
  const baseUrl = normalizeLavaBaseUrlInput(params.baseUrl)
  const apiKey = params.apiKey.trim()
  const url = `${baseUrl}/api/v2/products`
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] fetchLavaProductsFirstPage: GET`,
    payload: { url, hasKey: Boolean(apiKey) }
  })
  const response = await request({
    url,
    method: 'get',
    headers: {
      'X-Api-Key': apiKey,
      Accept: 'application/json'
    },
    responseType: 'json',
    throwHttpErrors: false,
    timeout: 15000
  })
  return { statusCode: response.statusCode ?? 0, body: response.body }
}

export type VerifyLavaCredentialsResult =
  | { ok: true; message: string; httpStatus: number }
  | { ok: false; message: string; httpStatus?: number }

/**
 * Проверка ключа: GET /api/v2/products — HTTP 200 означает, что авторизация прошла.
 */
export async function verifyLavaCredentials(
  ctx: app.Ctx,
  params: { apiKey: string; baseUrl: string }
): Promise<VerifyLavaCredentialsResult> {
  const apiKey = params.apiKey.trim()
  const baseUrl = normalizeLavaBaseUrlInput(params.baseUrl)
  if (!apiKey) {
    return { ok: false, message: 'Не задан API-ключ Lava.' }
  }
  if (!baseUrl) {
    return { ok: false, message: 'Не задан базовый URL Lava.' }
  }
  const { statusCode, body } = await fetchLavaProductsFirstPage(ctx, { apiKey, baseUrl })
  if (statusCode === 200) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] verifyLavaCredentials: успех (HTTP 200)`,
      payload: {}
    })
    return {
      ok: true,
      message: 'Ключ Lava принят, GET /api/v2/products вернул HTTP 200.',
      httpStatus: 200
    }
  }
  const snippet = httpErrorSnippet(body)
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] verifyLavaCredentials: отказ Lava`,
    payload: { statusCode, body: jsonForLog(body, 4000) }
  })
  return {
    ok: false,
    message: `Lava GET /api/v2/products: HTTP ${statusCode}${snippet ? `: ${snippet}` : ''}`,
    httpStatus: statusCode
  }
}

/**
 * GET /api/v2/products — первая страница каталога (диагностика и проверка ключа).
 */
export async function getProducts(ctx: app.Ctx): Promise<unknown> {
  const baseUrl = normalizeLavaBaseUrlInput(await settingsLib.getLavaBaseUrl(ctx))
  const apiKey = (await settingsLib.getLavaApiKey(ctx)).trim()

  if (!apiKey) {
    const err = new Error('Lava: в настройках не задан API-ключ')
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] getProducts: ветка нет API-ключа`,
      payload: {}
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] getProducts: нет API-ключа`,
      payload: {}
    })
    throw err
  }

  const { statusCode, body } = await fetchLavaProductsFirstPage(ctx, { apiKey, baseUrl })
  const url = `${baseUrl}/api/v2/products`

  if (statusCode !== 200) {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] getProducts: ветка HTTP ≠ 200`,
      payload: { statusCode, url }
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] getProducts: ошибка Lava`,
      payload: { statusCode, body: jsonForLog(body, 8000) }
    })
    throw new Error(`Lava GET products: HTTP ${statusCode}: ${httpErrorSnippet(body)}`)
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] getProducts: HTTP 200`,
    payload: { url, statusCode }
  })

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getProducts: успех`,
    payload: { statusCode }
  })

  return body
}

export type LavaCatalogRow = {
  productId: string
  productTitle: string
  offerId: string
  offerName: string
}

type OfferLike = { id?: string; name?: string | null }

function pushOffersForProduct(
  rows: LavaCatalogRow[],
  productId: string,
  productTitle: string,
  offers: unknown
): void {
  if (!Array.isArray(offers)) return
  for (const off of offers) {
    if (!off || typeof off !== 'object') continue
    const o = off as OfferLike
    if (typeof o.id === 'string' && o.id.length > 0) {
      rows.push({
        productId,
        productTitle,
        offerId: o.id,
        offerName: o.name ?? ''
      })
    }
  }
}

/**
 * Список пар продукт/оффер из GET /api/v2/products (с пагинацией по nextPage).
 * Поддерживаются два формата `items[]`: (1) лента OpenAPI — `{ type: "PRODUCT", data: { id, title, offers } }`;
 * (2) плоский продукт из API — `{ id, title, type, offers }` (например type CONSULTATION).
 */
export async function fetchLavaProductsCatalog(
  ctx: app.Ctx,
  params: { baseUrl: string; apiKey: string }
): Promise<{ rows: LavaCatalogRow[] }> {
  const base = normalizeLavaBaseUrlInput(params.baseUrl)
  const apiKey = params.apiKey.trim()
  if (!apiKey) {
    throw new Error('Не указан API-ключ Lava')
  }

  const maxPages = 30

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] fetchLavaProductsCatalog: старт пагинации`,
    payload: { base, maxPages }
  })

  const rows: LavaCatalogRow[] = []
  let nextUrl: string | null = `${base}/api/v2/products`
  let page = 0

  while (nextUrl && page < maxPages) {
    page += 1
    // Один аргумент — исходящий HTTP без ctx.app (outward); `request(ctx, …)` требует proxy app context.
    const response = await request({
      url: nextUrl,
      method: 'get',
      headers: {
        'X-Api-Key': apiKey,
        Accept: 'application/json'
      },
      responseType: 'json',
      throwHttpErrors: false,
      timeout: 20000
    })

    if (response.statusCode !== 200) {
      const snippet =
        typeof response.body === 'string' ? response.body : JSON.stringify(response.body ?? '')
      await loggerLib.writeServerLog(ctx, {
        severity: 7,
        message: `[${LOG_MODULE}] Lava GET /api/v2/products non-200 (debug raw)`,
        payload: {
          page,
          url: nextUrl,
          statusCode: response.statusCode,
          body: jsonForLog(response.body, 8000)
        }
      })
      throw new Error(`Lava ответила ${response.statusCode}: ${snippet.slice(0, 400)}`)
    }

    const parsed = response.body as {
      items?: Array<{ type?: string; data?: Record<string, unknown> }>
      nextPage?: string | null
    }

    const items = Array.isArray(parsed?.items) ? parsed.items : []

    const typeHistogram: Record<string, number> = {}
    for (const item of items) {
      const t = item?.type != null ? String(item.type) : '(missing)'
      typeHistogram[t] = (typeHistogram[t] ?? 0) + 1
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] Lava GET /api/v2/products response (debug raw)`,
      payload: {
        page,
        url: nextUrl,
        statusCode: response.statusCode,
        itemsCount: items.length,
        itemTypesHistogram: typeHistogram,
        responseBodyJson: jsonForLog(response.body)
      }
    })
    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      const raw = item as Record<string, unknown>

      const nested = raw.data
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const feedType = String(raw.type ?? '').toUpperCase()
        if (feedType === 'PRODUCT') {
          const d = nested as { id?: string; title?: string | null; offers?: unknown }
          if (typeof d.id === 'string' && d.id.length > 0) {
            pushOffersForProduct(rows, d.id, String(d.title ?? ''), d.offers)
            continue
          }
        }
      }

      if (typeof raw.id === 'string' && raw.id.length > 0 && raw.offers !== undefined) {
        pushOffersForProduct(rows, raw.id, String(raw.title ?? ''), raw.offers)
      }
    }

    nextUrl =
      parsed?.nextPage && typeof parsed.nextPage === 'string' && parsed.nextPage.length > 0
        ? parsed.nextPage
        : null
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] fetchLavaProductsCatalog done`,
    payload: { base, rowsCount: rows.length, pages: page }
  })

  if (rows.length === 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] catalog empty after parse — см. debug raw выше; ожидаются items с offers (плоский { id, offers } или лента { type: PRODUCT, data })`,
      payload: { base, pagesFetched: page }
    })
  }

  return { rows }
}
