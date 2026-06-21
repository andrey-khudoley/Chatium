// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const ChatsRbf = Heap.Table(
  't_chats_hu64VqOh_6NU_6NU',
  {
    userId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID пользователя' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    chatId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID чата' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    personId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID персоны' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    title: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Название чата' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Чаты', description: 'Чаты' } }
)

export default ChatsRbf

export type ChatsRbfRow = typeof ChatsRbf.T
export type ChatsRbfRowJson = typeof ChatsRbf.JsonT
