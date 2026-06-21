// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatAppSettings9JI = Heap.Table(
  't_projekt_chat_app_settings_5pT',
  {
    key: Heap.Optional(Heap.String({ customMeta: { title: 'Ключ настройки' } })),
    value: Heap.Optional(Heap.String({ customMeta: { title: 'Значение' } })),
    category: Heap.Optional(Heap.String({ customMeta: { title: 'Категория' } })),
    description: Heap.Optional(Heap.String({ customMeta: { title: 'Описание' } }))
  },
  { customMeta: { title: 'Настройки приложения', description: '' } }
)

export default TProjektChatAppSettings9JI

export type TProjektChatAppSettings9JIRow = typeof TProjektChatAppSettings9JI.T
export type TProjektChatAppSettings9JIRowJson = typeof TProjektChatAppSettings9JI.JsonT
