import { Heap } from '@app/heap'

/** Недельный трекер привычек: одна строка = одна календарная неделя (ключ — понедельник). */
export const JournalHabitsWeek = Heap.Table('t__assistant__journal_habits_week__9Hk2Mx', {
  userId: Heap.String({
    customMeta: { title: 'ID пользователя-владельца' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  mondayKey: Heap.String({
    customMeta: { title: 'Понедельник недели YYYY-MM-DD' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  rowsJson: Heap.String({ customMeta: { title: 'JSON: массив привычек и отметок по дням' } })
})

export default JournalHabitsWeek
export type JournalHabitsWeekRow = typeof JournalHabitsWeek.T
