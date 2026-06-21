import { Heap } from '@app/heap'

export const BrokerEvents = Heap.Table('t__neso-meta__broker_event__8Kf2Hn', {
  eventId: Heap.String({
    customMeta: { title: 'Event id' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  producerModule: Heap.String({ customMeta: { title: 'Producer module' } }),
  eventType: Heap.String({ customMeta: { title: 'Event type' } }),
  eventVersion: Heap.Number({ customMeta: { title: 'Event version' } }),
  contractKey: Heap.String({ customMeta: { title: 'Contract key' } }),
  schemaHash: Heap.String({ customMeta: { title: 'Schema hash' } }),
  occurredAt: Heap.Number({ customMeta: { title: 'Occurred at' } }),
  publishedAt: Heap.Number({ customMeta: { title: 'Published at' } }),
  targetModules: Heap.Any({ customMeta: { title: 'Target modules' } }),
  aggregateType: Heap.String({ customMeta: { title: 'Aggregate type' } }),
  aggregateId: Heap.String({ customMeta: { title: 'Aggregate id' } }),
  correlationId: Heap.String({ customMeta: { title: 'Correlation id' } }),
  causationId: Heap.String({ customMeta: { title: 'Causation id' } }),
  idempotencyKey: Heap.String({ customMeta: { title: 'Idempotency key' } }),
  idempotencyFingerprint: Heap.String({ customMeta: { title: 'Idempotency fingerprint' } }),
  payload: Heap.Any({ customMeta: { title: 'Raw payload' } }),
  metadata: Heap.Any({ customMeta: { title: 'Metadata without secrets' } })
})

export default BrokerEvents

export type BrokerEventsRow = typeof BrokerEvents.T
export type BrokerEventsRowJson = typeof BrokerEvents.JsonT
