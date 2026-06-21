// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TSendposttochannelSupportRequestsTIR = Heap.Table(
  't_sendposttochannel_supportRequests_W2t',
  {
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя' } })),
    chainId: Heap.Optional(Heap.String({ customMeta: { title: 'ID цепочки агента' } })),
    chainKey: Heap.Optional(Heap.String({ customMeta: { title: 'Key цепочки агента' } })),
    chatId: Heap.Optional(Heap.String({ customMeta: { title: 'ID Telegram чата' } })),
    text: Heap.Optional(Heap.String({ customMeta: { title: 'Текст запроса' } })),
    response: Heap.Optional(Heap.String({ customMeta: { title: 'Ответ агента' } })),
    telegramMessageId: Heap.Optional(
      Heap.Number({ customMeta: { title: 'ID сообщения в Telegram' } })
    )
  },
  { customMeta: { title: 'Support Requests', description: 'Support Requests' } }
)

export default TSendposttochannelSupportRequestsTIR

export type TSendposttochannelSupportRequestsTIRRow = typeof TSendposttochannelSupportRequestsTIR.T
export type TSendposttochannelSupportRequestsTIRRowJson =
  typeof TSendposttochannelSupportRequestsTIR.JsonT
