// @shared

export type OrderTVariant = 't1' | 't2'
export type OrderTCurrency = 'RUB' | 'EUR' | 'UAH'

const OFFER_MAP: Record<OrderTVariant, Record<OrderTCurrency, string>> = {
  t1: {
    RUB: '7149471',
    EUR: '7149472',
    UAH: '7149473'
  },
  t2: {
    RUB: '8238788',
    EUR: '8238796',
    UAH: '8238803'
  }
}

export function getOfferId(variant: OrderTVariant, currency: OrderTCurrency): string {
  return OFFER_MAP[variant][currency]
}
