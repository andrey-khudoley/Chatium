// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatClientLogsWPC = Heap.Table(
  't_projekt_chat_client_logs_2SL',
  {
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя' } })),
    type: Heap.Optional(Heap.String({ customMeta: { title: 'Тип' } })),
    message: Heap.Optional(Heap.String({ customMeta: { title: 'Сообщение' } })),
    details: Heap.Optional(Heap.String({ customMeta: { title: 'Детали' } })),
    userAgent: Heap.Optional(Heap.String({ customMeta: { title: 'User Agent' } })),
    url: Heap.Optional(Heap.String({ customMeta: { title: 'URL' } })),
  },
  { customMeta: { title: 'client-logs.table.ts', description: '' } },
)

export default TProjektChatClientLogsWPC

export type TProjektChatClientLogsWPCRow = typeof TProjektChatClientLogsWPC.T
export type TProjektChatClientLogsWPCRowJson = typeof TProjektChatClientLogsWPC.JsonT
