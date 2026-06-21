/**
 * Журнал исходящих вызовов gateway к LifePay.
 *
 * Создаётся при каждом фактическом обращении к LifePay (т.е. когда
 * `handleV1Op` прошёл валидацию и вызвал прикладной `handler`, который,
 * в свою очередь, выполнил `lifePayPostJson`/`lifePayGetJson`).
 *
 * Поле `rawLpJson` — полное тело ответа LifePay с PII-маскированием через
 * `shared/redactRaw.redactRawDeep`. При `kind != 'json_ok'` поле содержит
 * marker-объект `{ __kind, lpHttpStatus, __rawText }`.
 *
 * Поле `requestId` — `searchable` для связки с входящим запросом.
 */

import { Heap } from '@app/heap'

export const GatewayUpstreamLog = Heap.Table('t__saas-gw-lifepay__gups__U7q3Mn', {
  requestId: Heap.String({
    customMeta: { title: 'requestId входящего запроса' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  op: Heap.String({
    customMeta: { title: 'Операция' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  upstreamKind: Heap.String({
    customMeta: {
      title: 'json_ok | upstream_status | upstream_parse_error | network_error | timeout'
    }
  }),
  rawLpJson: Heap.Any({
    customMeta: { title: 'Полное тело LifePay (PII-маска)' }
  }),
  lpHttpStatus: Heap.Number({
    customMeta: { title: 'HTTP статус LifePay (0 если transport-ошибка)' }
  }),
  semanticRule: Heap.String({
    customMeta: { title: 'lpRule из billsV1Semantic (пусто если ok)' }
  }),
  durationMs: Heap.Number({
    customMeta: { title: 'Длительность вызова к LifePay, мс' }
  }),
  sentAt: Heap.Number({
    customMeta: { title: 'Unix ms начала исходящего вызова' }
  })
})

export default GatewayUpstreamLog

export type GatewayUpstreamLogRow = typeof GatewayUpstreamLog.T
export type GatewayUpstreamLogRowJson = typeof GatewayUpstreamLog.JsonT
