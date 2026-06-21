import type { PaymentCurrency } from '../rates/currencyConverter'

export const LAVATOP_OFFER_AMOUNT_LIMITS: Record<PaymentCurrency, { min: number; max: number }> = {
  RUB: { min: 50, max: 100_000_000 },
  USD: { min: 5, max: 10_000 },
  EUR: { min: 5, max: 10_000 }
}

function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

export function getLavatopOfferAmountLimits(currency: PaymentCurrency): {
  min: number
  max: number
} {
  return LAVATOP_OFFER_AMOUNT_LIMITS[currency]
}

export function isAmountWithinLavatopOfferLimits(
  amount: number,
  currency: PaymentCurrency
): boolean {
  const { min, max } = getLavatopOfferAmountLimits(currency)
  const rounded = roundToCents(amount)
  return rounded >= min && rounded <= max
}
