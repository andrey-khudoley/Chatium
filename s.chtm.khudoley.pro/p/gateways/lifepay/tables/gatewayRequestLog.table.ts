/**
 * Журнал входящих запросов клиентов к gateway (v1 контур).
 *
 * Каждый `POST /api/v1/{op}` создаёт ровно одну запись (через finally-обёртку
 * в `lib/gateway/handleV1Op.ts`). Сырое тело запроса (`rawArgs`) сохраняется
 * с PII-маскированием через `shared/redactRaw.redactRawDeep`: email/phone/паспорт
 * маскируются, секреты (`apikey`, `login`, `x-lp-apikey`, `x-lp-login`,
 * `authorization`, `cookie`) удаляются.
 *
 * Поля `requestId`, `op` — `searchable` для быстрой выборки в панели.
 */

import { Heap } from '@app/heap'

export const GatewayRequestLog = Heap.Table('t__saas-gw-lifepay__greq__G4n2Lp', {
  requestId: Heap.String({
    customMeta: { title: 'requestId (X-Gateway-Request-Id)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  op: Heap.String({
    customMeta: { title: 'Операция /v1/{op} (createBill, getBillStatus, cancelBill, …)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  contour: Heap.String({
    customMeta: { title: 'Контур каталога (bills_v1, …)' }
  }),
  method: Heap.String({
    customMeta: { title: 'HTTP метод (POST / GET)' }
  }),
  rawArgs: Heap.Any({
    customMeta: { title: 'Аргументы запроса с PII-маской' }
  }),
  rawHeadersSafe: Heap.Any({
    customMeta: { title: 'Заголовки запроса без секретов' }
  }),
  clientHttpStatus: Heap.Number({
    customMeta: { title: 'HTTP статус ответа gateway клиенту' }
  }),
  errorCode: Heap.String({
    customMeta: { title: 'GATEWAY_* код ошибки (пусто если ok)' }
  }),
  durationMs: Heap.Number({
    customMeta: { title: 'Длительность всей обработки на gateway, мс' }
  }),
  requestedAt: Heap.Number({
    customMeta: { title: 'Unix ms начала обработки' }
  })
})

export default GatewayRequestLog

export type GatewayRequestLogRow = typeof GatewayRequestLog.T
export type GatewayRequestLogRowJson = typeof GatewayRequestLog.JsonT
