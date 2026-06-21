import { Heap } from '@app/heap'

/** Общий план на неделю (одна строка = одна неделя). */
export const JournalWeekSummary = Heap.Table('t__assistant__journal_week_summary__3Fn8Rt', {
  userId: Heap.String({
    customMeta: { title: 'ID пользователя-владельца' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  mondayKey: Heap.String({
    customMeta: { title: 'Ключ понедельника недели YYYY-MM-DD' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  summaryText: Heap.String({ customMeta: { title: 'Общий план на неделю' } }),
  locked: Heap.Boolean({ customMeta: { title: 'План недели зафиксирован' } })
})

export default JournalWeekSummary
