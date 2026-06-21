import { Heap } from '@app/heap'

/**
 * Категории заметок блокнота: привязка к пользователю, название и цвет.
 * Поля id, createdAt, updatedAt — системные (не объявляем в схеме).
 */
export const NotebookCategories = Heap.Table('t__assistant__notebook_category__5Rk3Qw', {
  userId: Heap.String({
    customMeta: { title: 'ID пользователя-владельца' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  name: Heap.String({
    customMeta: { title: 'Название категории' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  color: Heap.String({
    customMeta: { title: 'Цвет HEX (#rrggbb)' }
  }),
  sortOrder: Heap.Number({
    customMeta: { title: 'Порядок в списке' }
  })
})

export default NotebookCategories

export type NotebookCategoriesRow = typeof NotebookCategories.T
export type NotebookCategoriesRowJson = typeof NotebookCategories.JsonT
