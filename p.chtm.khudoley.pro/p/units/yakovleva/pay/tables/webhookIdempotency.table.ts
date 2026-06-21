/**
 * Дедупликация webhook от LifePay (implementation-plan §1.8.1, §1.8.3).
 *
 * Heap-таблица с уникальным ключом по `number` (transaction number LifePay).
 * Проверка через `runWithExclusiveLock` + findByField + create —
 * Heap-схема платформы Chatium не выражает `unique: true` напрямую.
 */

import { Heap } from '@app/heap'

// Rebuild Heap registry after project path migration to p/units/yakovleva/pay.
export const WebhookIdempotency = Heap.Table('t__yakovleva-pay__whidem__e8Rs1V', {
  number: Heap.String({
    customMeta: { title: 'Transaction number LifePay (уникальный)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  firstSeenAt: Heap.Number({
    customMeta: { title: 'Unix ms момента первой регистрации' }
  })
})

export default WebhookIdempotency

export type WebhookIdempotencyRow = typeof WebhookIdempotency.T
export type WebhookIdempotencyRowJson = typeof WebhookIdempotency.JsonT
