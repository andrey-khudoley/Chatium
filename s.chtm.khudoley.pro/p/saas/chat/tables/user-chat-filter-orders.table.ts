// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatUserChatFilterOrdersL7K = Heap.Table(
  't_projekt_chat_user_chat_filter_orders_4Lw',
  {
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя' } })),
    filterId: Heap.Optional(Heap.String({ customMeta: { title: 'ID фильтра' } })),
    filterType: Heap.Optional(Heap.String({ customMeta: { title: 'Тип фильтра' } })),
    position: Heap.Optional(Heap.Number({ customMeta: { title: 'Позиция в списке' } }))
  },
  { customMeta: { title: 'Порядок фильтров чатов пользователя', description: '' } }
)

export default TProjektChatUserChatFilterOrdersL7K

export type TProjektChatUserChatFilterOrdersL7KRow = typeof TProjektChatUserChatFilterOrdersL7K.T
export type TProjektChatUserChatFilterOrdersL7KRowJson =
  typeof TProjektChatUserChatFilterOrdersL7K.JsonT
