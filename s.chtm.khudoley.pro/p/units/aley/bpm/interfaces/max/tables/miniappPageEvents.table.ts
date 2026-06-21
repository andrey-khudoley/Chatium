import { Heap } from '@app/heap'

export const MiniappPageEvents = Heap.Table(
  't__units-aley-bpm-interfaces-max__miniapp_page_event__M8n2Wp',
  {
    pageKey: Heap.String({
      customMeta: { title: 'Miniapp page key' },
      searchable: { langs: ['en'], embeddings: false }
    }),
    eventType: Heap.String({ customMeta: { title: 'bootstrap | action' } }),
    action: Heap.String({ customMeta: { title: 'Action name' } }),
    receivedAt: Heap.Number({ customMeta: { title: 'Received at' } }),
    maxUserId: Heap.String({ customMeta: { title: 'MAX user id as string' } }),
    chatId: Heap.String({ customMeta: { title: 'Chat id as string' } }),
    startParam: Heap.String({ customMeta: { title: 'Start param' } }),
    initDataHash: Heap.String({ customMeta: { title: 'initData hash' } }),
    payload: Heap.Any({ customMeta: { title: 'Sanitized payload' } }),
    brokerEventType: Heap.String({ customMeta: { title: 'Broker event type' } }),
    brokerEventId: Heap.String({ customMeta: { title: 'Core broker event id' } }),
    brokerTargetModules: Heap.Any({ customMeta: { title: 'Broker target modules' } }),
    brokerPublishStatus: Heap.String({
      customMeta: { title: 'not_published | published | failed | disabled' }
    }),
    brokerPublishedAt: Heap.Number({ customMeta: { title: 'Broker published at' } }),
    brokerPublishError: Heap.String({ customMeta: { title: 'Safe broker publish error' } })
  }
)

export default MiniappPageEvents

export type MiniappPageEventsRow = typeof MiniappPageEvents.T
export type MiniappPageEventsRowJson = typeof MiniappPageEvents.JsonT
