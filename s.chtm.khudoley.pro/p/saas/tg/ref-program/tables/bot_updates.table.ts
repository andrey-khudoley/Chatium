// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TSaasRefBotUpdate7Pq3Rs = Heap.Table(
  't__tg-ref-program__bot_update__7Pq3Rs',
  {
    campaignId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__campaign__8Hn4Lx', {
        customMeta: { title: 'Кампания' },
        onDelete: 'none'
      })
    ),
    botId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__bot__X7pQ2m', {
        customMeta: { title: 'Бот' },
        onDelete: 'none'
      })
    ),
    updateId: Heap.Optional(Heap.Number({ customMeta: { title: 'Update ID' } })),
    tgUserId: Heap.Optional(Heap.String({ customMeta: { title: 'Telegram User ID' } })),
    updateType: Heap.Optional(Heap.String({ customMeta: { title: 'Тип апдейта' } })),
    payloadJson: Heap.Optional(Heap.Any({ customMeta: { title: 'Payload' } }))
  },
  { customMeta: { title: 'Апдейты бота', description: 'История апдейтов Telegram' } }
)

export default TSaasRefBotUpdate7Pq3Rs

export type TSaasRefBotUpdate7Pq3RsRow = typeof TSaasRefBotUpdate7Pq3Rs.T
export type TSaasRefBotUpdate7Pq3RsRowJson = typeof TSaasRefBotUpdate7Pq3Rs.JsonT
