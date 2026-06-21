import { Heap } from '@app/heap'

export const BrokerSubscriptions = Heap.Table('t__neso-meta__broker_subscription__6Vp4Ld', {
  subscriptionKey: Heap.String({
    customMeta: { title: 'Subscription key consumerModule:name' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  consumerModule: Heap.String({ customMeta: { title: 'Consumer module' } }),
  displayName: Heap.String({ customMeta: { title: 'Display name' } }),
  enabled: Heap.Boolean({ customMeta: { title: 'Declared enabled' } }),
  adminDisabled: Heap.Boolean({ customMeta: { title: 'Admin disabled' } }),
  adminDisabledAt: Heap.Number({ customMeta: { title: 'Admin disabled at' } }),
  adminDisableReason: Heap.String({ customMeta: { title: 'Admin disable reason' } }),
  sourceModules: Heap.Any({ customMeta: { title: 'Source module patterns' } }),
  eventTypes: Heap.Any({ customMeta: { title: 'Event type patterns' } }),
  targetedOnly: Heap.Boolean({ customMeta: { title: 'Targeted only' } }),
  notificationMode: Heap.String({ customMeta: { title: 'none | internal | socket | both' } }),
  notificationHandlerKey: Heap.String({ customMeta: { title: 'Internal handler key' } }),
  notificationSocketKey: Heap.String({ customMeta: { title: 'Socket key' } }),
  notificationBatchWindowMs: Heap.Number({ customMeta: { title: 'Notification batch window' } }),
  maxBatchSize: Heap.Number({ customMeta: { title: 'Default poll max batch size' } }),
  ackTimeoutMs: Heap.Number({ customMeta: { title: 'Ack timeout ms' } }),
  retryPolicy: Heap.Any({ customMeta: { title: 'Retry policy' } }),
  createdAt: Heap.Number({ customMeta: { title: 'Created at' } }),
  updatedAt: Heap.Number({ customMeta: { title: 'Updated at' } }),
  metadata: Heap.Any({ customMeta: { title: 'Metadata without secrets' } })
})

export default BrokerSubscriptions

export type BrokerSubscriptionsRow = typeof BrokerSubscriptions.T
export type BrokerSubscriptionsRowJson = typeof BrokerSubscriptions.JsonT
