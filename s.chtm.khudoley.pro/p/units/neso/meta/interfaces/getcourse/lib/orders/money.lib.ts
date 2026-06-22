/**
 * Хелпер Money для работы с Heap.Money.
 * Вся работа с Money-значениями — только через эти функции.
 */

import { Money } from '@app/heap'

// Список допустимых ISO 4217 валют (расширяемый)
const KNOWN_CURRENCIES: readonly string[] = [
  'RUB',
  'USD',
  'EUR',
  'GBP',
  'BYN',
  'KZT',
  'UAH',
  'UZS',
  'AMD',
  'AZN',
  'GEL'
]

/**
 * Создаёт Money из числовой суммы и строки валюты.
 * Нормализует валюту к uppercase; неизвестную с непустым значением — бросает ошибку.
 * Пустая/null строка валюты → дефолт 'RUB'.
 */
export function toMoney(amount: number, currency: string): Money {
  const normalized = currency ? currency.trim().toUpperCase() : 'RUB'
  if (!KNOWN_CURRENCIES.includes(normalized)) {
    throw new Error(`Неизвестная валюта: "${currency}". Допустимые: ${KNOWN_CURRENCIES.join(', ')}`)
  }
  // @ts-ignore
  return new Money(amount, normalized)
}

/**
 * Извлекает числовую сумму и строку валюты из Money.
 * Крэш-гард: если m == null/undefined — возвращает { amount: 0, currency: 'RUB' }.
 */
export function fromMoney(m: Money): { amount: number; currency: string } {
  if (m == null) {
    return { amount: 0, currency: 'RUB' }
  }
  return {
    amount: (m as unknown as { amount: number }).amount,
    currency: (m as unknown as { currency: string }).currency
  }
}
