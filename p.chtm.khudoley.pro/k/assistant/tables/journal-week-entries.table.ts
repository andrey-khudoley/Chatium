import { Heap } from '@app/heap'

/** Недельные записи по дням (одна строка = один день). */
export const JournalWeekEntries = Heap.Table('t__assistant__journal_week_entry__7Qm2Lp', {
  userId: Heap.String({
    customMeta: { title: 'ID пользователя-владельца' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  dayKey: Heap.String({
    customMeta: { title: 'Ключ дня YYYY-MM-DD' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  planText: Heap.String({ customMeta: { title: 'План на день' } }),
  locked: Heap.Boolean({ customMeta: { title: 'План зафиксирован' } })
})

export default JournalWeekEntries
export type JournalWeekEntriesRow = typeof JournalWeekEntries.T
