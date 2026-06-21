/**
 * Журнал входящих вебхуков Lava.Top (`PurchaseWebhookLog`) и результат их форварда клиенту.
 *
 * Запись создаётся при приёме вебхука в `lib/webhook/webhookRelay.service.processWebhook`.
 * Дедупликация — по `dedupe_key = eventType:contractId:status`. Форвард на клиентский
 * callback (best-effort) фиксируется в `forward_url` / `forward_status_code` / `forward_error`.
 *
 * Паттерн адаптирован из `p/units/aom/lava_gc_integration/tables/lava_webhook_event.table.ts`.
 * Поля `lava_contract_id`, `dedupe_key` — `searchable` (поиск маппинга/дедупа).
 */

import { Heap } from '@app/heap'

export const LavatopWebhookEvent = Heap.Table('t__saas-gw-lavatop__whe__X3pL8s', {
  event_type: Heap.String({
    customMeta: { title: 'Тип webhook-события (payment.success, subscription.cancelled, …)' }
  }),
  lava_contract_id: Heap.String({
    customMeta: { title: 'contractId из payload Lava.Top' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  payload_json: Heap.String({
    customMeta: { title: 'Сырой payload вебхука (JSON-строка)' }
  }),
  dedupe_key: Heap.String({
    customMeta: { title: 'Ключ дедупликации (eventType:contractId:status)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  processed: Heap.Boolean({
    customMeta: { title: 'Обработано' }
  }),
  processed_at: Heap.Number({
    customMeta: { title: 'Unix ms момента обработки (0 если не обработано)' }
  }),
  processing_error: Heap.String({
    customMeta: { title: 'Ошибка обработки (contract_not_found и т.п.; пусто если успех)' }
  }),
  forward_url: Heap.String({
    customMeta: { title: 'URL клиентского callback, на который выполнен форвард (пусто если нет)' }
  }),
  forward_status_code: Heap.Number({
    customMeta: { title: 'HTTP статус ответа клиентского callback (0 если форвард не выполнялся)' }
  }),
  forward_error: Heap.String({
    customMeta: { title: 'Ошибка форварда (timeout/network; пусто если успех или нет форварда)' }
  }),
  created_at: Heap.Number({
    customMeta: { title: 'Unix ms момента приёма вебхука' }
  })
})

export default LavatopWebhookEvent

export type LavatopWebhookEventRow = typeof LavatopWebhookEvent.T
export type LavatopWebhookEventRowJson = typeof LavatopWebhookEvent.JsonT
