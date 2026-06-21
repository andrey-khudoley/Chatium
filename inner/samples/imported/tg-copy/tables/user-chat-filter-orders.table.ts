// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatUserChatFilterOrdersSvK = Heap.Table(
  't_projekt_chat_user_chat_filter_orders_i4a',
  {
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя' } })),
    filterId: Heap.Optional(Heap.String({ customMeta: { title: 'ID фильтра' } })),
    filterType: Heap.Optional(Heap.String({ customMeta: { title: 'Тип фильтра' } })),
    position: Heap.Optional(Heap.Number({ customMeta: { title: 'Позиция в списке' } })),
  },
  { customMeta: { title: 'user-chat-filter-orders.table.ts', description: '' } },
)

export default TProjektChatUserChatFilterOrdersSvK

export type TProjektChatUserChatFilterOrdersSvKRow = typeof TProjektChatUserChatFilterOrdersSvK.T
export type TProjektChatUserChatFilterOrdersSvKRowJson = typeof TProjektChatUserChatFilterOrdersSvK.JsonT
