import { Heap } from '@app/heap'

export const Logs = Heap.Table('t__tg-ref-program__log__x7Kp9m', {
  message: Heap.String({
    customMeta: { title: 'Сообщение' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  payload: Heap.Any({
    customMeta: { title: 'Данные (JSON)' }
  }),
  severity: Heap.Number({
    customMeta: { title: 'Severity (syslog 0–7)' }
  }),
  level: Heap.String({
    customMeta: { title: 'Уровень (emergency…debug)' }
  }),
  timestamp: Heap.Number({
    customMeta: { title: 'Время (Unix ms)' }
  })
})

export default Logs

export type LogsRow = typeof Logs.T
export type LogsRowJson = typeof Logs.JsonT
