// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatReadMentionsZsi = Heap.Table(
  't_projekt_chat_read_mentions_A8y',
  {
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя' } })),
    feedId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата (feedId)' } })),
    messageId: Heap.Optional(Heap.String({ customMeta: { title: 'ID сообщения с упоминанием' } })),
    readAt: Heap.Optional(Heap.DateTime({ customMeta: { title: 'Дата прочтения' } })),
  },
  { customMeta: { title: 'read-mentions.table.ts', description: '' } },
)

export default TProjektChatReadMentionsZsi

export type TProjektChatReadMentionsZsiRow = typeof TProjektChatReadMentionsZsi.T
export type TProjektChatReadMentionsZsiRowJson = typeof TProjektChatReadMentionsZsi.JsonT
