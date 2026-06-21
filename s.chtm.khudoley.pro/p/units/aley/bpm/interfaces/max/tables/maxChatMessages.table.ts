import { Heap } from '@app/heap'

export const MaxChatMessages = Heap.Table(
  't__units-aley-bpm-interfaces-max__max_chat_message__H6p2Qz',
  {
    chatId: Heap.String({ customMeta: { title: 'Chat id as string' } }),
    messageId: Heap.String({ customMeta: { title: 'Message id as string' } }),
    maxTimestamp: Heap.Number({ customMeta: { title: 'MAX timestamp' } }),
    fetchedAt: Heap.Number({ customMeta: { title: 'Fetched at' } }),
    source: Heap.String({ customMeta: { title: 'history_refresh | webhook_copy' } }),
    refreshRunId: Heap.String({ customMeta: { title: 'Refresh run id' } }),
    senderUserId: Heap.String({ customMeta: { title: 'Sender user id as string' } }),
    fingerprint: Heap.String({ customMeta: { title: 'Message fingerprint' } }),
    rawMessage: Heap.Any({ customMeta: { title: 'Safe raw message' } }),
    safePreview: Heap.String({ customMeta: { title: 'Safe preview' } })
  }
)

export default MaxChatMessages

export type MaxChatMessagesRow = typeof MaxChatMessages.T
export type MaxChatMessagesRowJson = typeof MaxChatMessages.JsonT
