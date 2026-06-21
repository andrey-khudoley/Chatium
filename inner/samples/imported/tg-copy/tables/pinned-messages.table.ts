// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatPinnedMessagesTss = Heap.Table(
  't_projekt_chat_pinned_messages_uFC',
  {
    chatId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата (feedId)' } })),
    messageId: Heap.Optional(Heap.String({ customMeta: { title: 'ID сообщения' } })),
    pinnedBy: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Кто закрепил' } })),
    pinnedAt: Heap.Optional(Heap.DateTime({ customMeta: { title: 'Когда закреплено' } })),
  },
  { customMeta: { title: 'pinned-messages.table.ts', description: '' } },
)

export default TProjektChatPinnedMessagesTss

export type TProjektChatPinnedMessagesTssRow = typeof TProjektChatPinnedMessagesTss.T
export type TProjektChatPinnedMessagesTssRowJson = typeof TProjektChatPinnedMessagesTss.JsonT
