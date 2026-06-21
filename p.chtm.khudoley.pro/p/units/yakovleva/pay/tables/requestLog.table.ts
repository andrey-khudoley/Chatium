/**
 * Журнал исходящих вызовов payments-gateway (implementation-plan §1.8.1).
 *
 * Одна запись на каждый `POST /api/gateways/invoke`. Поля `requestId`, `orderNumber`
 * — `searchable` для быстрого поиска по UI.
 *
 * Поля `argsRedacted` и `rawResponseBody` хранят **сырые** данные (клиент —
 * оператор ПД, маскировать не требуется). Колонки оставлены под прежними
 * именами для совместимости с существующими записями; структурная гигиена
 * (циклы/несериализуемое/усечение) — через `shared/prepareRawLog.prepareRawLog`.
 *
 * Ключ таблицы обновлён после переименования проекта на `p/units/yakovleva/pay`.
 * Это сознательный reset Heap-данных: старые записи из прежнего префикса
 * не читаются этой версией проекта.
 *
 * Поле `gatewayId` (опциональное) добавлено 2026-05-28 для многогейтвейной
 * архитектуры. Значения — `'lifepay' | 'lavatop'`. Старые записи без этого
 * поля считаются legacy и в UI помечаются как `'—'` / неопределённый гейтвей.
 */

import { Heap } from '@app/heap'

// Rebuild Heap registry after project path migration to p/units/yakovleva/pay.
export const RequestLog = Heap.Table('t__yakovleva-pay__reqlog__c7Np4S', {
  requestId: Heap.String({
    customMeta: { title: 'Request ID (X-Gateway-Request-Id)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  gatewayId: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Идентификатор гейтвея (lifepay / lavatop)' },
      searchable: { langs: ['en'], embeddings: false }
    })
  ),
  op: Heap.String({
    customMeta: {
      title:
        'Operation (createBill / getBillStatus / cancelBill / createInvoice / getInvoiceStatus / listProducts / updateOfferPrice)'
    }
  }),
  argsRedacted: Heap.Any({
    customMeta: { title: 'Аргументы запроса (raw, без маскирования)' }
  }),
  orderNumber: Heap.String({
    customMeta: { title: 'orderNumber из args (для связки с webhook)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  correlationId: Heap.Optional(
    Heap.String({
      customMeta: {
        title:
          'correlationId из callbackUrl/args (UUID или числовой dealId, для надёжной связки с webhook)'
      }
    })
  ),
  gcDealNumber: Heap.Optional(
    Heap.String({
      customMeta: {
        title:
          'GC поле number (номер заказа) из getDealFields — для передачи в createDeal.deal_number'
      }
    })
  ),
  clientHttpStatus: Heap.Number({
    customMeta: { title: 'HTTP-статус ответа gateway' }
  }),
  ok: Heap.Boolean({
    customMeta: { title: 'Успех (ok === true в теле gateway)' }
  }),
  errorCode: Heap.String({
    customMeta: { title: 'error.code из тела (пусто при ok)' }
  }),
  lpHttpStatus: Heap.Number({
    customMeta: { title: 'HTTP-статус LifePay из details.lpHttpStatus (0 если нет)' }
  }),
  lpSemanticRule: Heap.String({
    customMeta: { title: 'details.lpRule семантической ошибки bills_v1_* (пусто если нет)' }
  }),
  lpNumericCode: Heap.Number({
    customMeta: { title: 'details.lpNumericCode (0 если нет)' }
  }),
  durationMs: Heap.Number({
    customMeta: { title: 'Длительность исходящего вызова, мс' }
  }),
  requestedAt: Heap.Number({
    customMeta: { title: 'Unix ms момента исходящего вызова к gateway' }
  }),
  rawResponseBody: Heap.Any({
    customMeta: { title: 'Полное тело ответа gateway (raw, без маскирования)' }
  })
})

export default RequestLog

export type RequestLogRow = typeof RequestLog.T
export type RequestLogRowJson = typeof RequestLog.JsonT
