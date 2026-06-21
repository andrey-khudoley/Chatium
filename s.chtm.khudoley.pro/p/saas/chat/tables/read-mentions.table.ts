// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatReadMentionsODc = Heap.Table(
  't_projekt_chat_read_mentions_CHp',
  {
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя' } })),
    feedId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата (feedId)' } })),
    messageId: Heap.Optional(Heap.String({ customMeta: { title: 'ID сообщения с упоминанием' } })),
    readAt: Heap.Optional(Heap.DateTime({ customMeta: { title: 'Дата прочтения' } }))
  },
  { customMeta: { title: 'Прочитанные упоминания', description: '' } }
)

export default TProjektChatReadMentionsODc

export type TProjektChatReadMentionsODcRow = typeof TProjektChatReadMentionsODc.T
export type TProjektChatReadMentionsODcRowJson = typeof TProjektChatReadMentionsODc.JsonT
