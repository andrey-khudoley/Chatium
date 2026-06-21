/**
 * Журнал входящих запросов клиентов к gateway (v1 контур GetCourse).
 *
 * Каждый `POST|GET /api/v1/{op}` создаёт ровно одну запись (через finally-обёртку
 * в `lib/gateway/handleV1Op.ts`). Сырое тело запроса (`rawArgs`) сохраняется
 * с PII-маскированием через `shared/redactRaw.redactRawDeep`: email/phone/ФИО/паспорт
 * маскируются, секреты (`gc_developer_api_key`, `key`, `params`, `x-gc-school-api-key`,
 * `x-gc-school-host`, `authorization`, `cookie`) удаляются.
 *
 * Поля `requestId`, `op` — `searchable` для быстрой выборки в панели.
 */

import { Heap } from '@app/heap'

export const GatewayRequestLog = Heap.Table('t__saas-gw-gc__greq__Gr9Qm2', {
  requestId: Heap.String({
    customMeta: { title: 'requestId (X-Gateway-Request-Id)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  op: Heap.String({
    customMeta: { title: 'Операция /v1/{op} (addUser, exportUsers, …)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  contour: Heap.String({
    customMeta: { title: 'Контур каталога (new, legacy)' }
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
    customMeta: { title: 'INVOKE_* / GATEWAY_* код ошибки (пусто если ok)' }
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
