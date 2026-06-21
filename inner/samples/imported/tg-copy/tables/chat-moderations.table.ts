// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatChatModerations734 = Heap.Table(
  't_projekt_chat_chat_moderations_5XH',
  {
    chatId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата' } })),
    userId: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Пользователь' } })),
    moderatedBy: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Модератор' } })),
    type: Heap.Optional(Heap.String({ customMeta: { title: 'Тип модерации' } })),
    reason: Heap.Optional(Heap.String({ customMeta: { title: 'Причина' } })),
    duration: Heap.Optional(Heap.Number({ customMeta: { title: 'Длительность в минутах' } })),
    expiresAt: Heap.Optional(Heap.DateTime({ customMeta: { title: 'Дата окончания' } })),
    isPermanent: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Навсегда' } })),
    isActive: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Активна' } })),
  },
  { customMeta: { title: 'chat-moderations.table.ts', description: '' } },
)

export default TProjektChatChatModerations734

export type TProjektChatChatModerations734Row = typeof TProjektChatChatModerations734.T
export type TProjektChatChatModerations734RowJson = typeof TProjektChatChatModerations734.JsonT
