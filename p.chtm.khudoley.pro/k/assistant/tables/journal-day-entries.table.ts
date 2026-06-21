import { Heap } from '@app/heap'

/** Ежедневные заметки по сегментам дня (ночь/утро/день/вечер) с фиксацией. */
export const JournalDayEntries = Heap.Table('t__assistant__journal_day_entry__4Hd9Qa', {
  userId: Heap.String({
    customMeta: { title: 'ID пользователя-владельца' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  dayKey: Heap.String({
    customMeta: { title: 'Ключ периода дня YYYY-MM-DD (граница 05:00)' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  nightText: Heap.String({ customMeta: { title: 'Ночь: текст' } }),
  nightLocked: Heap.Boolean({ customMeta: { title: 'Ночь: зафиксировано' } }),
  morningText: Heap.String({ customMeta: { title: 'Утро: текст' } }),
  morningLocked: Heap.Boolean({ customMeta: { title: 'Утро: зафиксировано' } }),
  dayText: Heap.String({ customMeta: { title: 'День: текст' } }),
  dayLocked: Heap.Boolean({ customMeta: { title: 'День: зафиксировано' } }),
  eveningText: Heap.String({ customMeta: { title: 'Вечер: текст' } }),
  eveningLocked: Heap.Boolean({ customMeta: { title: 'Вечер: зафиксировано' } })
})

export default JournalDayEntries
export type JournalDayEntriesRow = typeof JournalDayEntries.T
