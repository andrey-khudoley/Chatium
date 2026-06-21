// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatUserPinnedChatsLzT = Heap.Table(
  't_projekt_chat_user_pinned_chats_dSe',
  {
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя' } })),
    feedId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата (feedId)' } })),
    sortOrder: Heap.Optional(Heap.Number({ customMeta: { title: 'Порядок сортировки' } })),
  },
  { customMeta: { title: 'user-pinned-chats.table.ts', description: '' } },
)

export default TProjektChatUserPinnedChatsLzT

export type TProjektChatUserPinnedChatsLzTRow = typeof TProjektChatUserPinnedChatsLzT.T
export type TProjektChatUserPinnedChatsLzTRowJson = typeof TProjektChatUserPinnedChatsLzT.JsonT
