import { Heap } from '@app/heap'

/**
 * Заметки блокнота журнала: привязка к пользователю, заголовок и текст.
 * Расширенные поля: папка, категории, привязка к задачам, дата, архив, порядок.
 * Поля id, createdAt, updatedAt — системные (не объявляем в схеме).
 */
export const JournalNotes = Heap.Table('t__assistant__journal_note__8Kp2Nx', {
  userId: Heap.String({
    customMeta: { title: 'ID пользователя-владельца' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  title: Heap.String({
    customMeta: { title: 'Название заметки' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  content: Heap.String({
    customMeta: { title: 'Содержание' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  folderId: Heap.Optional(Heap.String({ customMeta: { title: 'ID папки' } })),
  categoryIds: Heap.Optional(Heap.String({ customMeta: { title: 'JSON-массив ID категорий' } })),
  linkedTaskId: Heap.Optional(Heap.String({ customMeta: { title: 'Привязка к задаче (task_item.id)' } })),
  linkedProjectId: Heap.Optional(Heap.String({ customMeta: { title: 'Привязка к проекту (task_project.id)' } })),
  linkedClientId: Heap.Optional(Heap.String({ customMeta: { title: 'Привязка к клиенту (task_client.id)' } })),
  noteDate: Heap.Optional(Heap.String({ customMeta: { title: 'Дата заметки (YYYY-MM-DD)' } })),
  isArchived: Heap.Optional(Heap.Boolean({ customMeta: { title: 'В архиве' } })),
  sortOrder: Heap.Optional(Heap.Number({ customMeta: { title: 'Порядок внутри папки/корня' } }))
})

export default JournalNotes

export type JournalNotesRow = typeof JournalNotes.T
export type JournalNotesRowJson = typeof JournalNotes.JsonT
