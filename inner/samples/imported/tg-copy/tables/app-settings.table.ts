// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatAppSettingsRuG = Heap.Table(
  't_projekt_chat_app_settings_KH2',
  {
    key: Heap.Optional(Heap.String({ customMeta: { title: 'Ключ настройки' } })),
    value: Heap.Optional(Heap.String({ customMeta: { title: 'Значение' } })),
    category: Heap.Optional(Heap.String({ customMeta: { title: 'Категория' } })),
    description: Heap.Optional(Heap.String({ customMeta: { title: 'Описание' } })),
  },
  { customMeta: { title: 'app-settings.table.ts', description: '' } },
)

export default TProjektChatAppSettingsRuG

export type TProjektChatAppSettingsRuGRow = typeof TProjektChatAppSettingsRuG.T
export type TProjektChatAppSettingsRuGRowJson = typeof TProjektChatAppSettingsRuG.JsonT
