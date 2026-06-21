/**
 * Кэш суммы GC-заказа для config-эндпоинта (доступность виджетов).
 *
 * TTL-логика реализована в коде (`lib/gateway/gcDealCache.ts`), поскольку
 * платформа Chatium не предоставляет встроенного in-memory TTL-кэша.
 *
 * Известные ограничения:
 * - Устаревшие (TTL истёк) записи удаляются при cache miss в getCachedGcDealAmount.
 * - Гонка при параллельных запросах — терпима, кэш не источник истины.
 */

import { Heap } from '@app/heap'

// Rebuild Heap registry after project path migration to p/units/yakovleva/pay.
export const GcDealCache = Heap.Table('t__yakovleva-pay__gcdcache__m7Nq3X', {
  dealId: Heap.String({
    customMeta: { title: 'Нормализованный dealId GC' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  cachedAt: Heap.Number({ customMeta: { title: 'Unix ms момента кэширования' } }),
  amount: Heap.Number({
    customMeta: { title: 'Рублёвый эквивалент суммы заказа (RUB; для USD/EUR — конвертировано)' }
  })
})

export default GcDealCache
export type GcDealCacheRow = typeof GcDealCache.T
export type GcDealCacheRowJson = typeof GcDealCache.JsonT
