import { Heap } from '@app/heap'

/**
 * Заметки инбокса журнала (отдельно от блокнота `journal-notes`).
 * Только текст и архив; поля id, createdAt, updatedAt — системные.
 */
export const InboxNotes = Heap.Table('t__assistant__inbox_note__7Np4Kx', {
  userId: Heap.String({
    customMeta: { title: 'ID пользователя-владельца' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  title: Heap.String({
    customMeta: { title: 'Первая строка / превью' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  content: Heap.String({
    customMeta: { title: 'Текст заметки' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  isArchived: Heap.Optional(Heap.Boolean({ customMeta: { title: 'В архиве' } })),
  sortOrder: Heap.Optional(Heap.Number({ customMeta: { title: 'Порядок сортировки' } }))
})

export default InboxNotes

export type InboxNotesRow = typeof InboxNotes.T
export type InboxNotesRowJson = typeof InboxNotes.JsonT
