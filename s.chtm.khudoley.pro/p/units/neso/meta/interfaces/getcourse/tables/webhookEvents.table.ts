import { Heap } from '@app/heap'

export const WebhookEvents = Heap.Table('t__neso_meta_gc_iface__webhook_events__kQ7nW2', {
  webhookId: Heap.String({ customMeta: { title: 'ID вебхука (дедупликация)' } }),
  orderKey: Heap.String({ customMeta: { title: 'Ключ заказа' } }),
  gcDealNumber: Heap.String({ customMeta: { title: 'Номер сделки GC' } }),
  gcDealId: Heap.String({ customMeta: { title: 'ID сделки GC' } }),
  status: Heap.String({ customMeta: { title: 'Статус GC (raw)' } }),
  isPayed: Heap.Boolean({ customMeta: { title: 'Признак оплаты' } }),
  payload: Heap.Any({ customMeta: { title: 'Тело вебхука (raw)' } }),
  processed: Heap.Boolean({ customMeta: { title: 'Обработан' } })
})

export default WebhookEvents

export type WebhookEventsRow = typeof WebhookEvents.T
export type WebhookEventsRowJson = typeof WebhookEvents.JsonT
