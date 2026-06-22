import { DEFAULT_CURRENCY } from './constants'

export type NormalizedCheckoutForm = {
  email: string
  amount: number
  currency: string
  offerId?: string
  firstName?: string
  lastName?: string
  phone?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  comment?: string
  sourceUrl?: string
  returnUrl?: string
}

type NormalizeResult = { ok: true; value: NormalizedCheckoutForm } | { ok: false; error: string }

function trimStr(v: unknown): string {
  if (typeof v === 'string') return v.trim()
  return ''
}

function optField(v: unknown): string | undefined {
  const s = trimStr(v)
  return s || undefined
}

/**
 * Нормализует сырые поля формы checkout.
 * - Строки тримируются.
 * - amount приводится к числу > 0, иначе ошибка.
 * - currency fallback → DEFAULT_CURRENCY.
 * - email обязателен.
 * - Опциональные пустые поля не включаются в результат.
 */
export function normalizeCheckoutForm(raw: unknown): NormalizeResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Тело запроса не является объектом' }
  }

  const r = raw as Record<string, unknown>

  const email = trimStr(r.email)
  if (!email) {
    return { ok: false, error: 'Поле email обязательно' }
  }

  const rawAmount = r.amount
  const amountNum = Number(rawAmount)
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return { ok: false, error: 'Поле amount должно быть числом > 0' }
  }

  const currency = trimStr(r.currency) || DEFAULT_CURRENCY

  const value: NormalizedCheckoutForm = {
    email,
    amount: amountNum,
    currency
  }

  const offerId = optField(r.offerId)
  if (offerId !== undefined) value.offerId = offerId

  const firstName = optField(r.firstName)
  if (firstName !== undefined) value.firstName = firstName

  const lastName = optField(r.lastName)
  if (lastName !== undefined) value.lastName = lastName

  const phone = optField(r.phone)
  if (phone !== undefined) value.phone = phone

  const utmSource = optField(r.utmSource)
  if (utmSource !== undefined) value.utmSource = utmSource

  const utmMedium = optField(r.utmMedium)
  if (utmMedium !== undefined) value.utmMedium = utmMedium

  const utmCampaign = optField(r.utmCampaign)
  if (utmCampaign !== undefined) value.utmCampaign = utmCampaign

  const utmContent = optField(r.utmContent)
  if (utmContent !== undefined) value.utmContent = utmContent

  const utmTerm = optField(r.utmTerm)
  if (utmTerm !== undefined) value.utmTerm = utmTerm

  const comment = optField(r.comment)
  if (comment !== undefined) value.comment = comment

  const sourceUrl = optField(r.sourceUrl)
  if (sourceUrl !== undefined) value.sourceUrl = sourceUrl

  const returnUrl = optField(r.returnUrl)
  if (returnUrl !== undefined) value.returnUrl = returnUrl

  return { ok: true, value }
}
