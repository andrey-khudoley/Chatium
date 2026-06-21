/**
 * Журнал исходящих вызовов gateway к GetCourse.
 *
 * Создаётся при каждом фактическом обращении к GC (т.е. когда `handleV1Op`
 * прошёл валидацию и вызвал per-op handler, который выполнил
 * `invokeNewGcApi`/`invokeLegacyGcImportPost`/`invokeLegacyGcExportGet`).
 *
 * Поле `rawGcJson` — тело ответа GC с PII-маскированием через
 * `shared/redactRaw.redactRawDeep`. При не-JSON / транспорт-ошибке поле содержит
 * marker-объект `{ __kind, gcHttpStatus, __rawText }`.
 *
 * Поле `requestId` — `searchable` для связки с входящим запросом.
 */

import { Heap } from '@app/heap'

export const GatewayUpstreamLog = Heap.Table('t__saas-gw-gc__gups__Up7Mn3', {
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
      title: 'json_ok | upstream_error | json_parse_error | semantic | timeout | network_error'
    }
  }),
  rawGcJson: Heap.Any({
    customMeta: { title: 'Тело ответа GetCourse (PII-маска)' }
  }),
  gcHttpStatus: Heap.Number({
    customMeta: { title: 'HTTP статус GetCourse (0 если transport-ошибка)' }
  }),
  semanticRule: Heap.String({
    customMeta: { title: 'gcRule из interpretGcContourResponse (пусто если ok)' }
  }),
  durationMs: Heap.Number({
    customMeta: { title: 'Длительность вызова к GetCourse, мс' }
  }),
  sentAt: Heap.Number({
    customMeta: { title: 'Unix ms начала исходящего вызова' }
  })
})

export default GatewayUpstreamLog

export type GatewayUpstreamLogRow = typeof GatewayUpstreamLog.T
export type GatewayUpstreamLogRowJson = typeof GatewayUpstreamLog.JsonT
