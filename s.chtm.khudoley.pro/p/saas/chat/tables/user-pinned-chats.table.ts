// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatUserPinnedChats232 = Heap.Table(
  't_projekt_chat_user_pinned_chats_Ydk',
  {
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя' } })),
    feedId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата (feedId)' } })),
    sortOrder: Heap.Optional(Heap.Number({ customMeta: { title: 'Порядок сортировки' } }))
  },
  { customMeta: { title: 'Закрепленные чаты пользователя', description: '' } }
)

export default TProjektChatUserPinnedChats232

export type TProjektChatUserPinnedChats232Row = typeof TProjektChatUserPinnedChats232.T
export type TProjektChatUserPinnedChats232RowJson = typeof TProjektChatUserPinnedChats232.JsonT
