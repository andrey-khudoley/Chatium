import type { LavaCurrency } from './lava-types'

/**
 * Допустимые пределы суммы в PATCH `/api/v2/products` (цена оффера) для Lava.
 * RUB: минимум — из практики интеграции (лайв-тесты); USD/EUR — по ответу Lava HTTP 400
 * (`Amount=… not in allowed limits=(5, 10000) for EUR`).
 */
export const LAVA_OFFER_AMOUNT_LIMITS: Record<LavaCurrency, { min: number; max: number }> = {
  RUB: { min: 50, max: 100_000_000 },
  USD: { min: 5, max: 10_000 },
  EUR: { min: 5, max: 10_000 }
}

function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

export function getLavaOfferAmountLimits(currency: LavaCurrency): { min: number; max: number } {
  return LAVA_OFFER_AMOUNT_LIMITS[currency]
}

/** Сравнение с лимитами — с округлением до копеек, как после конвертации ЦБ. */
export function isAmountWithinLavaOfferLimits(amount: number, currency: LavaCurrency): boolean {
  const { min, max } = getLavaOfferAmountLimits(currency)
  const a = roundToCents(amount)
  return a >= min && a <= max
}

export function buildLavaOfferAmountOutOfRangeMessage(params: {
  currency: LavaCurrency
  effectiveAmount: number
  min: number
  max: number
  sourceAmountRub?: number
}): string {
  const { currency, effectiveAmount, min, max, sourceAmountRub } = params
  if (currency === 'RUB') {
    return `Сумма ${effectiveAmount} RUB вне допустимого диапазона Lava для RUB (${min}…${max}). Измените сумму заказа.`
  }
  const rubPart = sourceAmountRub != null ? ` Исходная сумма в рублях: ${sourceAmountRub}.` : ''
  return `После конвертации по курсу ЦБ сумма в ${currency} составляет ${effectiveAmount}, это вне допустимого диапазона Lava для ${currency} (${min}…${max}).${rubPart} Скорректируйте сумму заказа в GetCourse.`
}
