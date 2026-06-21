// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatChatsSKT = Heap.Table(
  't_projekt_chat_chats_yz5',
  {
    feedId: Heap.Optional(Heap.String({ customMeta: { title: 'ID фида в Feed API' } })),
    title: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Название чата' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    type: Heap.Optional(Heap.String({ customMeta: { title: 'Тип чата' } })),
    owner: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Создатель чата' } })),
    isPublic: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Публичный чат' } })),
    description: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Описание чата' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    avatarHash: Heap.Optional(Heap.String({ customMeta: { title: 'Хеш аватара чата' } })),
    pinnedMessageId: Heap.Optional(
      Heap.String({ customMeta: { title: 'ID закрепленного сообщения' } })
    ),
    isPaid: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Платный чат' } }))
  },
  { customMeta: { title: 'Чаты', description: '' } }
)

export default TProjektChatChatsSKT

export type TProjektChatChatsSKTRow = typeof TProjektChatChatsSKT.T
export type TProjektChatChatsSKTRowJson = typeof TProjektChatChatsSKT.JsonT
