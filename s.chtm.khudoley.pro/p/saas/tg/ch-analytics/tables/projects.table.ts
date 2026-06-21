import { Heap } from '@app/heap'

/**
 * Таблица для хранения проектов
 *
 * Каждая запись содержит:
 * - name: название проекта
 * - description: описание проекта (опционально)
 * - members: массив участников с ролями { userId: string, role: 'owner' | 'member' }
 * - settings: настройки проекта (опционально)
 *
 * Системные поля createdAt и updatedAt добавляются автоматически
 */
export const Projects = Heap.Table('t__tg_channel_analytics__projects__a1b2c3d4', {
  name: Heap.String({
    customMeta: { title: 'Название проекта' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  description: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Описание проекта' },
      searchable: { langs: ['ru', 'en'], embeddings: false }
    })
  ),
  members: Heap.Array(
    Heap.Object({
      userId: Heap.String({
        customMeta: { title: 'ID пользователя' }
      }),
      role: Heap.Union([Heap.Literal('owner'), Heap.Literal('member')], {
        customMeta: { title: 'Роль' }
      })
    }),
    {
      customMeta: { title: 'Участники проекта' }
    }
  ),
  settings: Heap.Optional(
    Heap.Any({
      customMeta: { title: 'Настройки проекта' }
    })
  )
})

export default Projects
