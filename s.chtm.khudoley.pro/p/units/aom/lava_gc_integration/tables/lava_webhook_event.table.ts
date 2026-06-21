import { Heap } from '@app/heap'

export const LavaWebhookEvent = Heap.Table('t__lava-gc-integration__webhook-event__3Kp7Qs', {
  event_type: Heap.String({ customMeta: { title: 'Тип webhook события' } }),
  lava_contract_id: Heap.String({ customMeta: { title: 'ID контракта Lava' } }),
  payload_json: Heap.String({ customMeta: { title: 'Сырой payload JSON' } }),
  dedupe_key: Heap.String({ customMeta: { title: 'Ключ дедупликации' } }),
  processed: Heap.Boolean({ customMeta: { title: 'Обработано' } }),
  processed_at: Heap.Number({ customMeta: { title: 'Время обработки (Unix ms)' } }),
  processing_error: Heap.String({ customMeta: { title: 'Ошибка обработки' } }),
  created_at: Heap.Number({ customMeta: { title: 'Время приёма (Unix ms)' } })
})

export default LavaWebhookEvent

export type LavaWebhookEventRow = typeof LavaWebhookEvent.T
export type LavaWebhookEventRowJson = typeof LavaWebhookEvent.JsonT
