import { Heap } from '@app/heap'

export const BrokerDeliveries = Heap.Table('t__units-aley-bpm-core__broker_delivery__5Dw9Rt', {
  deliveryId: Heap.String({
    customMeta: { title: 'Delivery id' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  eventId: Heap.String({ customMeta: { title: 'Event id' } }),
  subscriptionKey: Heap.String({ customMeta: { title: 'Subscription key' } }),
  consumerModule: Heap.String({ customMeta: { title: 'Consumer module' } }),
  eventPublishedAt: Heap.Number({ customMeta: { title: 'Event published at' } }),
  eventType: Heap.String({ customMeta: { title: 'Event type' } }),
  eventVersion: Heap.Number({ customMeta: { title: 'Event version' } }),
  contractKey: Heap.String({ customMeta: { title: 'Contract key' } }),
  schemaHash: Heap.String({ customMeta: { title: 'Schema hash' } }),
  producerModule: Heap.String({ customMeta: { title: 'Producer module' } }),
  aggregateType: Heap.String({ customMeta: { title: 'Aggregate type' } }),
  aggregateId: Heap.String({ customMeta: { title: 'Aggregate id' } }),
  status: Heap.String({
    customMeta: { title: 'pending | claimed | acked | failed | dead_letter | skipped' }
  }),
  attempts: Heap.Number({ customMeta: { title: 'Explicit fail attempts' } }),
  availableAt: Heap.Number({ customMeta: { title: 'Available at' } }),
  claimedAt: Heap.Number({ customMeta: { title: 'Claimed at' } }),
  claimedUntil: Heap.Number({ customMeta: { title: 'Claimed until' } }),
  claimTokenHash: Heap.String({ customMeta: { title: 'Claim token hash' } }),
  lastError: Heap.String({ customMeta: { title: 'Safe last error' } }),
  ackedAt: Heap.Number({ customMeta: { title: 'Acked at' } }),
  createdAt: Heap.Number({ customMeta: { title: 'Created at' } }),
  updatedAt: Heap.Number({ customMeta: { title: 'Updated at' } })
})

export default BrokerDeliveries

export type BrokerDeliveriesRow = typeof BrokerDeliveries.T
export type BrokerDeliveriesRowJson = typeof BrokerDeliveries.JsonT
