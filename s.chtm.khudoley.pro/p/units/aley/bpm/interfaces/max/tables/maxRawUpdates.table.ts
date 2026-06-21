import { Heap } from '@app/heap'

export const MaxRawUpdates = Heap.Table(
  't__units-aley-bpm-interfaces-max__max_raw_update__R4w9Mx',
  {
    source: Heap.String({ customMeta: { title: 'webhook | long_polling' } }),
    updateType: Heap.String({
      customMeta: { title: 'MAX update_type' },
      searchable: { langs: ['ru', 'en'], embeddings: false }
    }),
    maxTimestamp: Heap.Number({ customMeta: { title: 'MAX timestamp' } }),
    receivedAt: Heap.Number({ customMeta: { title: 'Received at' } }),
    chatId: Heap.String({ customMeta: { title: 'Chat id as string' } }),
    userId: Heap.String({ customMeta: { title: 'User id as string' } }),
    fingerprint: Heap.String({ customMeta: { title: 'Raw update fingerprint' } }),
    rawUpdate: Heap.Any({ customMeta: { title: 'Raw MAX update' } }),
    rawMeta: Heap.Any({ customMeta: { title: 'Safe raw metadata' } }),
    brokerEventType: Heap.String({ customMeta: { title: 'Broker event type' } }),
    brokerEventId: Heap.String({ customMeta: { title: 'Core broker event id' } }),
    brokerPublishStatus: Heap.String({
      customMeta: { title: 'not_published | published | failed | disabled' }
    }),
    brokerPublishedAt: Heap.Number({ customMeta: { title: 'Broker published at' } }),
    brokerPublishError: Heap.String({ customMeta: { title: 'Safe broker publish error' } })
  }
)

export default MaxRawUpdates

export type MaxRawUpdatesRow = typeof MaxRawUpdates.T
export type MaxRawUpdatesRowJson = typeof MaxRawUpdates.JsonT
