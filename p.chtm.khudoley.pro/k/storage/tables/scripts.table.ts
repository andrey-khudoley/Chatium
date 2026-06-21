// @shared-table
// Таблица для хранения скриптов и стилей
import { Heap } from '@app/heap'

export const ScriptsTable = Heap.Table('storage_scripts', {
  name: Heap.String({
    customMeta: { title: 'Уникальное имя скрипта/стиля' }
  }),
  description: Heap.String({
    customMeta: { title: 'Описание' },
    defaultValue: ''
  }),
  type: Heap.String({
    customMeta: { title: 'Тип: script или style' }
  }),
  content: Heap.String({
    customMeta: { title: 'Содержимое' }
  })
  // createdAt и updatedAt добавляются автоматически
})

export default ScriptsTable

