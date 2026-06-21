import { Heap } from '@app/heap'

/**
 * Папки для заметок блокнота: привязка к пользователю, название, цвет, порядок, архив.
 * Поля id, createdAt, updatedAt — системные (не объявляем в схеме).
 */
export const NotebookFolders = Heap.Table('t__assistant__notebook_folder__8Lm4Tp', {
  userId: Heap.String({
    customMeta: { title: 'ID пользователя-владельца' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  name: Heap.String({
    customMeta: { title: 'Название папки' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  color: Heap.String({
    customMeta: { title: 'Цвет HEX (#rrggbb)' }
  }),
  sortOrder: Heap.Number({
    customMeta: { title: 'Порядок в списке' }
  }),
  isArchived: Heap.Boolean({
    customMeta: { title: 'В архиве' }
  })
})

export default NotebookFolders

export type NotebookFoldersRow = typeof NotebookFolders.T
export type NotebookFoldersRowJson = typeof NotebookFolders.JsonT
