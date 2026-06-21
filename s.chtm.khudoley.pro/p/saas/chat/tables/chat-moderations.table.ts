// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatChatModerationsEoe = Heap.Table(
  't_projekt_chat_chat_moderations_dy2',
  {
    chatId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата' } })),
    userId: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Пользователь' } })),
    moderatedBy: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Модератор' } })),
    type: Heap.Optional(Heap.String({ customMeta: { title: 'Тип модерации' } })),
    reason: Heap.Optional(Heap.String({ customMeta: { title: 'Причина' } })),
    duration: Heap.Optional(Heap.Number({ customMeta: { title: 'Длительность в минутах' } })),
    expiresAt: Heap.Optional(Heap.DateTime({ customMeta: { title: 'Дата окончания' } })),
    isPermanent: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Навсегда' } })),
    isActive: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Активна' } }))
  },
  { customMeta: { title: 'Модерации в чатах', description: '' } }
)

export default TProjektChatChatModerationsEoe

export type TProjektChatChatModerationsEoeRow = typeof TProjektChatChatModerationsEoe.T
export type TProjektChatChatModerationsEoeRowJson = typeof TProjektChatChatModerationsEoe.JsonT
