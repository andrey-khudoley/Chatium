/**
 * Журнал исходящих вызовов gateway к Lava.Top.
 *
 * Создаётся при каждом фактическом обращении к Lava.Top (т.е. когда `handleV1Op`
 * прошёл валидацию и вызвал прикладной `handler`, который выполнил вызов через
 * `lavaTopClient`).
 *
 * Поле `rawLpJson` — тело ответа Lava.Top с PII-маскированием через
 * `shared/redactRaw.redactRawDeep`. При `kind != 'json_ok'` поле содержит
 * marker-объект `{ __kind, lpHttpStatus, __rawText }`.
 *
 * Поле `requestId` — `searchable` для связки с входящим запросом.
 */

import { Heap } from '@app/heap'

export const GatewayUpstreamLog = Heap.Table('t__saas-gw-lavatop__gups__N9qF4w', {
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
      title:
        'json_ok | upstream_status | upstream_parse_error | network_error | timeout | rate_limited'
    }
  }),
  rawLpJson: Heap.Any({
    customMeta: { title: 'Тело ответа Lava.Top (PII-маска)' }
  }),
  lpHttpStatus: Heap.Number({
    customMeta: { title: 'HTTP статус Lava.Top (0 если transport-ошибка)' }
  }),
  semanticRule: Heap.String({
    customMeta: { title: 'lpRule из invoicesV1Semantic (пусто если ok)' }
  }),
  durationMs: Heap.Number({
    customMeta: { title: 'Длительность вызова к Lava.Top, мс' }
  }),
  sentAt: Heap.Number({
    customMeta: { title: 'Unix ms начала исходящего вызова' }
  })
})

export default GatewayUpstreamLog

export type GatewayUpstreamLogRow = typeof GatewayUpstreamLog.T
export type GatewayUpstreamLogRowJson = typeof GatewayUpstreamLog.JsonT
