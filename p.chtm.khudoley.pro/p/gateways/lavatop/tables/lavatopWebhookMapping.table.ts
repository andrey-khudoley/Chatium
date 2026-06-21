/**
 * Маппинг `contractId → клиентский callback-URL` для проксирования вебхуков Lava.Top.
 *
 * Создаётся в `POST /v1/createInvoice`, если клиент передал `callbackUrl` (после получения
 * `contractId` от Lava.Top). При приёме вебхука `webhookRelay.service` ищет запись по
 * `contract_id` (для рекуррентных — fallback по `parentContractId`) и форвардит payload на
 * сохранённый `callback_url` целиком (с исходными query-параметрами).
 *
 * Уникальность `contract_id` платформа Heap в схеме не выражает — обеспечивается на уровне
 * приложения через `createOrUpdateBy('contract_id', …)` в репозитории.
 * `contract_id` — `searchable` (основной путь чтения — поиск по contractId из вебхука).
 */

import { Heap } from '@app/heap'

export const LavatopWebhookMapping = Heap.Table('t__saas-gw-lavatop__whm__C5jH7t', {
  contract_id: Heap.String({
    customMeta: { title: 'contractId Lava.Top (уникальный)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  callback_url: Heap.String({
    customMeta: { title: 'Клиентский callback-URL (с query-параметрами)' }
  }),
  client_order_id: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Идентификатор заказа на стороне клиента (опционально)' }
    })
  ),
  created_at: Heap.Number({
    customMeta: { title: 'Unix ms момента создания маппинга' }
  })
})

export default LavatopWebhookMapping

export type LavatopWebhookMappingRow = typeof LavatopWebhookMapping.T
export type LavatopWebhookMappingRowJson = typeof LavatopWebhookMapping.JsonT
