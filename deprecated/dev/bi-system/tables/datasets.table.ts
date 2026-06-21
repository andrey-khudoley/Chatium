import { Heap } from '@app/heap'

/**
 * Таблица для хранения конфигурации датасетов
 * Датасет - это набор выбранных событий с параметрами для последующей визуализации
 * Примечание: поля createdAt и updatedAt добавляются автоматически Heap
 *
 * Heap ID (id) уже является неизменяемым идентификатором, который не зависит от названия
 * и не меняется при переименовании датасета
 */
export const AnalyticsDatasets = Heap.Table('analytics_datasets_d8a4e7f2', {
  name: Heap.String({
    customMeta: { title: 'Название датасета' }
  }),
  description: Heap.String({
    customMeta: { title: 'Описание датасета' }
  }),
  config: Heap.String({
    customMeta: { title: 'JSON конфигурация компонентов датасета' }
  })
})
