/**
 * Сборка тела JSON для исходящего `POST /api/v3/invoice` к Lava.Top (CreateInvoiceV3Request).
 * Источник истины — OpenAPI Lava.Top (`lava_gc_integration/docs/reference/lavatop-openapi3.yaml`).
 *
 * `apikey` НЕ входит в тело — он передаётся в заголовке `X-Api-Key` (lavaTopClient).
 * `callbackUrl` НЕ входит в тело к Lava.Top — это адрес клиентского вебхука, который gateway
 * сохраняет в маппинге (`lavatopWebhookMapping`) и не пересылает в Lava.Top.
 */

import type { LavaCurrency } from './lavaTypes'

export type CreateInvoiceArgs = {
  email: string
  offerId: string
  currency: LavaCurrency
  paymentProvider?: string
  paymentMethod?: string
  buyerLanguage?: string
  periodicity?: string
  clientUtm?: Record<string, unknown>
  /** Клиентский callback-URL для проксирования вебхука; в тело Lava.Top НЕ попадает. */
  callbackUrl?: string
  /** Идентификатор заказа на стороне клиента (для маппинга); в тело Lava.Top НЕ попадает. */
  clientOrderId?: string
}

export type CreateInvoiceLtBody = {
  email: string
  offerId: string
  currency: LavaCurrency
  paymentProvider?: string
  paymentMethod?: string
  buyerLanguage?: string
  periodicity?: string
  clientUtm?: Record<string, unknown>
}

export function buildCreateInvoiceBody(args: CreateInvoiceArgs): CreateInvoiceLtBody {
  const body: CreateInvoiceLtBody = {
    email: args.email,
    offerId: args.offerId,
    currency: args.currency
  }
  if (args.paymentProvider) body.paymentProvider = args.paymentProvider
  if (args.paymentMethod) body.paymentMethod = args.paymentMethod
  if (args.buyerLanguage) body.buyerLanguage = args.buyerLanguage
  if (args.periodicity) body.periodicity = args.periodicity
  if (args.clientUtm && typeof args.clientUtm === 'object') body.clientUtm = args.clientUtm
  return body
}

/** Копия тела без email (PII) — для безопасного логирования. */
export function redactCreateInvoiceBodyForLog(
  body: CreateInvoiceLtBody
): Omit<CreateInvoiceLtBody, 'email'> {
  const { email: _e, ...rest } = body
  return rest
}

/**
 * SSRF-защита клиентского `callbackUrl` (на него gateway форвардит payload вебхука).
 * Разрешён только http(s) с публичным хостом: блокируются localhost, loopback, link-local/metadata
 * (169.254.*), приватные диапазоны RFC1918 (10.*, 192.168.*, 172.16–31.*) и IPv6-литералы.
 */
export function isSafeForwardUrl(raw: string): boolean {
  const t = (raw ?? '').trim()
  if (!/^https?:\/\//i.test(t)) return false
  const m = /^https?:\/\/([^/?#]+)/i.exec(t)
  if (!m || !m[1]) return false
  let host = m[1].toLowerCase()
  const at = host.lastIndexOf('@')
  if (at >= 0) host = host.slice(at + 1) // отбросить user:pass@
  // IPv6-литерал в скобках — блокируем (в т.ч. [::1]); иначе срезаем порт по последнему ':'
  if (host.startsWith('[')) return false
  const colon = host.indexOf(':')
  if (colon >= 0) host = host.slice(0, colon)
  if (!host) return false
  if (host === 'localhost' || host.endsWith('.localhost')) return false
  if (host === '0.0.0.0' || host === '::1') return false
  if (/^127\./.test(host)) return false
  if (/^10\./.test(host)) return false
  if (/^192\.168\./.test(host)) return false
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false
  if (/^169\.254\./.test(host)) return false
  return true
}
