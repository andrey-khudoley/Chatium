// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatClientLogs29e = Heap.Table(
  't_projekt_chat_client_logs_TB8',
  {
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя' } })),
    type: Heap.Optional(Heap.String({ customMeta: { title: 'Тип' } })),
    message: Heap.Optional(Heap.String({ customMeta: { title: 'Сообщение' } })),
    details: Heap.Optional(Heap.String({ customMeta: { title: 'Детали' } })),
    userAgent: Heap.Optional(Heap.String({ customMeta: { title: 'User Agent' } })),
    url: Heap.Optional(Heap.String({ customMeta: { title: 'URL' } }))
  },
  { customMeta: { title: 'Клиентские логи', description: '' } }
)

export default TProjektChatClientLogs29e

export type TProjektChatClientLogs29eRow = typeof TProjektChatClientLogs29e.T
export type TProjektChatClientLogs29eRowJson = typeof TProjektChatClientLogs29e.JsonT
