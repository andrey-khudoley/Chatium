import { Heap } from '@app/heap'

export const BrokerNotificationAttempts = Heap.Table(
  't__template-metaproject__broker_notification_attempt__2Ps8Na',
  {
    notificationId: Heap.String({
      customMeta: { title: 'Notification id' },
      searchable: { langs: ['en'], embeddings: false }
    }),
    consumerModule: Heap.String({ customMeta: { title: 'Consumer module' } }),
    subscriptionKey: Heap.String({ customMeta: { title: 'Subscription key' } }),
    deliveryIds: Heap.Any({ customMeta: { title: 'Delivery ids' } }),
    mode: Heap.String({ customMeta: { title: 'internal | socket' } }),
    handlerKey: Heap.String({ customMeta: { title: 'Handler or socket key without secrets' } }),
    status: Heap.String({ customMeta: { title: 'pending | sent | failed | skipped' } }),
    attempts: Heap.Number({ customMeta: { title: 'Attempts' } }),
    nextAttemptAt: Heap.Number({ customMeta: { title: 'Next attempt at' } }),
    lastError: Heap.String({ customMeta: { title: 'Safe last error' } }),
    createdAt: Heap.Number({ customMeta: { title: 'Created at' } }),
    updatedAt: Heap.Number({ customMeta: { title: 'Updated at' } })
  }
)

export default BrokerNotificationAttempts

export type BrokerNotificationAttemptsRow = typeof BrokerNotificationAttempts.T
export type BrokerNotificationAttemptsRowJson = typeof BrokerNotificationAttempts.JsonT
