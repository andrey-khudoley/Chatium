// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TKalendarZapisiAdminUsersBth = Heap.Table(
  't_kalendar-zapisi_adminUsers_ydI',
  {
    email: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Email администратора' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    firstName: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Имя' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    lastName: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Фамилия' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    role: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Роль' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    isActive: Heap.Optional(
      Heap.Boolean({
        customMeta: { title: 'Активен' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    isOwner: Heap.Optional(
      Heap.Boolean({
        customMeta: { title: 'Владелец' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Администраторы календаря', description: 'Администраторы календаря' } }
)

export default TKalendarZapisiAdminUsersBth

export type TKalendarZapisiAdminUsersBthRow = typeof TKalendarZapisiAdminUsersBth.T
export type TKalendarZapisiAdminUsersBthRowJson = typeof TKalendarZapisiAdminUsersBth.JsonT
