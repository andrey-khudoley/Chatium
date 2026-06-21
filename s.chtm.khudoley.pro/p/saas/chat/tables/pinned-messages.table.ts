// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatPinnedMessagesUFF = Heap.Table(
  't_projekt_chat_pinned_messages_WFM',
  {
    chatId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата (feedId)' } })),
    messageId: Heap.Optional(Heap.String({ customMeta: { title: 'ID сообщения' } })),
    pinnedBy: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Кто закрепил' } })),
    pinnedAt: Heap.Optional(Heap.DateTime({ customMeta: { title: 'Когда закреплено' } }))
  },
  { customMeta: { title: 'Закрепленные сообщения', description: '' } }
)

export default TProjektChatPinnedMessagesUFF

export type TProjektChatPinnedMessagesUFFRow = typeof TProjektChatPinnedMessagesUFF.T
export type TProjektChatPinnedMessagesUFFRowJson = typeof TProjektChatPinnedMessagesUFF.JsonT
