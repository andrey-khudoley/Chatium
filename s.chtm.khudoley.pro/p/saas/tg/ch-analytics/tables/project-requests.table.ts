import { Heap } from '@app/heap'

/**
 * Таблица для хранения заявок на присоединение к проекту
 *
 * Каждая запись содержит:
 * - projectId: ID проекта
 * - userId: ID пользователя, подавшего заявку
 * - status: статус заявки ('pending' | 'approved' | 'rejected')
 * - requestedAt: дата подачи заявки
 * - processedAt: дата обработки заявки (опционально)
 * - processedBy: ID пользователя, обработавшего заявку (опционально)
 *
 * Системные поля createdAt и updatedAt добавляются автоматически Heap
 */
export const ProjectRequests = Heap.Table('t__tg_channel_analytics__project_requests__a1b2c3d4', {
  projectId: Heap.String({
    customMeta: { title: 'ID проекта' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  userId: Heap.String({
    customMeta: { title: 'ID пользователя' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  status: Heap.Union(
    [Heap.Literal('pending'), Heap.Literal('approved'), Heap.Literal('rejected')],
    {
      customMeta: { title: 'Статус заявки' }
    }
  ),
  requestedAt: Heap.DateTime({
    customMeta: { title: 'Дата подачи заявки' }
  }),
  processedAt: Heap.Optional(
    Heap.DateTime({
      customMeta: { title: 'Дата обработки заявки' }
    })
  ),
  processedBy: Heap.Optional(
    Heap.String({
      customMeta: { title: 'ID пользователя, обработавшего заявку' },
      searchable: { langs: ['ru', 'en'], embeddings: false }
    })
  )
})

export default ProjectRequests
