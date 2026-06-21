import type { LavaCurrency } from './lava-types'

/**
 * Нормализация кода валюты для Lava (POST /api/v3/invoice, PATCH цен оффера).
 * Поддерживаются RUB / USD / EUR по спецификации Lava.
 */
export function normalizeLavaCurrency(raw: string): LavaCurrency | null {
  const key = raw.trim().toUpperCase()
  if (key === 'RUB' || key === 'RUR') return 'RUB'
  if (key === 'USD') return 'USD'
  if (key === 'EUR') return 'EUR'
  return null
}
