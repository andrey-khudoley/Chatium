// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatChatFolderItemsGKC = Heap.Table(
  't_projekt_chat_chat_folder_items_6T6',
  {
    folderId: Heap.Optional(Heap.String({ customMeta: { title: 'ID папки' } })),
    feedId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата (feedId)' } })),
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя-владельца' } })),
    addedAt: Heap.Optional(Heap.DateTime({ customMeta: { title: 'Дата добавления' } }))
  },
  { customMeta: { title: 'Чаты в папках', description: '' } }
)

export default TProjektChatChatFolderItemsGKC

export type TProjektChatChatFolderItemsGKCRow = typeof TProjektChatChatFolderItemsGKC.T
export type TProjektChatChatFolderItemsGKCRowJson = typeof TProjektChatChatFolderItemsGKC.JsonT
