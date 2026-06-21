// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatChatFoldersL3E = Heap.Table(
  't_projekt_chat_chat_folders_EcG',
  {
    name: Heap.Optional(Heap.String({ customMeta: { title: 'Название папки' } })),
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя-владельца' } })),
    sortOrder: Heap.Optional(Heap.Number({ customMeta: { title: 'Порядок сортировки' } })),
    icon: Heap.Optional(Heap.String({ customMeta: { title: 'Иконка (emoji или класс)' } })),
    color: Heap.Optional(Heap.String({ customMeta: { title: 'Цвет папки' } }))
  },
  { customMeta: { title: 'Папки чатов', description: '' } }
)

export default TProjektChatChatFoldersL3E

export type TProjektChatChatFoldersL3ERow = typeof TProjektChatChatFoldersL3E.T
export type TProjektChatChatFoldersL3ERowJson = typeof TProjektChatChatFoldersL3E.JsonT
