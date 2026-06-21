// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatChatFolderItemsBaA = Heap.Table(
  't_projekt_chat_chat_folder_items_uzZ',
  {
    folderId: Heap.Optional(Heap.String({ customMeta: { title: 'ID папки' } })),
    feedId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата (feedId)' } })),
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя-владельца' } })),
    addedAt: Heap.Optional(Heap.DateTime({ customMeta: { title: 'Дата добавления' } })),
  },
  { customMeta: { title: 'chat-folder-items.table.ts', description: '' } },
)

export default TProjektChatChatFolderItemsBaA

export type TProjektChatChatFolderItemsBaARow = typeof TProjektChatChatFolderItemsBaA.T
export type TProjektChatChatFolderItemsBaARowJson = typeof TProjektChatChatFolderItemsBaA.JsonT
