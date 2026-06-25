// @shared
import type { Budget, Transaction, SpendBar } from '../types/finance'

export const seedBudgets: Budget[] = [
  { name: 'Питание', spent: 18400, limit: 25000 },
  { name: 'Транспорт', spent: 4200, limit: 6000 },
  { name: 'Разработка / подписки', spent: 12800, limit: 15000 },
  { name: 'Развлечения', spent: 8900, limit: 10000 },
  { name: 'Образование', spent: 14000, limit: 20000 },
  { name: 'Прочее', spent: 34100, limit: 44000 }
]

export const seedTransactions: Transaction[] = [
  { id: 'tx1', name: 'Яндекс Плюс', cat: 'Подписки', date: '22 июн', amt: -299 },
  { id: 'tx2', name: 'Перевод от клиента', cat: 'Доходы', date: '21 июн', amt: 85000 },
  { id: 'tx3', name: 'ВкусВилл', cat: 'Питание', date: '21 июн', amt: -2340 },
  { id: 'tx4', name: 'GitHub Copilot', cat: 'Разработка', date: '20 июн', amt: -1980 },
  { id: 'tx5', name: 'Кофейня', cat: 'Питание', date: '20 июн', amt: -480 },
  { id: 'tx6', name: 'Такси', cat: 'Транспорт', date: '19 июн', amt: -650 }
]

export const seedSpendBars: SpendBar[] = [
  { m: 'Янв', v: 78 },
  { m: 'Фев', v: 65 },
  { m: 'Мар', v: 92 },
  { m: 'Апр', v: 71 },
  { m: 'Май', v: 84 },
  { m: 'Июн', v: 92 }
]

export const seedAccounts = [
  { name: 'Сбербанк · Текущий', v: '48 320 ₽' },
  { name: 'Тинькофф · Накопительный', v: '62 400 ₽' },
  { name: 'Наличные', v: '8 200 ₽' }
]
