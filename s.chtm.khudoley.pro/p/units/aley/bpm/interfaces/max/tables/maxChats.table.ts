import { Heap } from '@app/heap'

export const MaxChats = Heap.Table('t__units-aley-bpm-interfaces-max__max_chat__C7h4Rt', {
  chatId: Heap.String({
    customMeta: { title: 'MAX chat id as string' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  chatType: Heap.String({ customMeta: { title: 'dialog | chat | channel | unknown' } }),
  status: Heap.String({ customMeta: { title: 'active | removed | left | closed | unknown' } }),
  title: Heap.String({ customMeta: { title: 'Title' } }),
  dialogUserId: Heap.String({ customMeta: { title: 'Dialog user id' } }),
  lastEventTime: Heap.Number({ customMeta: { title: 'Last event time' } }),
  lastMessageAt: Heap.Number({ customMeta: { title: 'Last message at' } }),
  historyMessageCount: Heap.Number({ customMeta: { title: 'History message count' } }),
  maxMessagesCount: Heap.Number({ customMeta: { title: 'MAX messages_count' } }),
  lastHistoryRefreshRunId: Heap.String({ customMeta: { title: 'Last history refresh run id' } }),
  lastHistoryRefreshStatus: Heap.String({ customMeta: { title: 'Last history refresh status' } }),
  discoveredAt: Heap.Number({ customMeta: { title: 'Discovered at' } }),
  updatedAt: Heap.Number({ customMeta: { title: 'Updated at' } }),
  rawChat: Heap.Any({ customMeta: { title: 'Safe raw chat' } }),
  lastError: Heap.String({ customMeta: { title: 'Safe last error' } })
})

export default MaxChats

export type MaxChatsRow = typeof MaxChats.T
export type MaxChatsRowJson = typeof MaxChats.JsonT
