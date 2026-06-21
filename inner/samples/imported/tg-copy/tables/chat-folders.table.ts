// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatChatFoldersTxF = Heap.Table(
  't_projekt_chat_chat_folders_V5l',
  {
    name: Heap.Optional(Heap.String({ customMeta: { title: 'Название папки' } })),
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя-владельца' } })),
    sortOrder: Heap.Optional(Heap.Number({ customMeta: { title: 'Порядок сортировки' } })),
    icon: Heap.Optional(Heap.String({ customMeta: { title: 'Иконка (emoji или класс)' } })),
    color: Heap.Optional(Heap.String({ customMeta: { title: 'Цвет папки' } })),
  },
  { customMeta: { title: 'chat-folders.table.ts', description: '' } },
)

export default TProjektChatChatFoldersTxF

export type TProjektChatChatFoldersTxFRow = typeof TProjektChatChatFoldersTxF.T
export type TProjektChatChatFoldersTxFRowJson = typeof TProjektChatChatFoldersTxF.JsonT
