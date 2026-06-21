// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TSaasTgRefBotX7pQ2m = Heap.Table(
  't__tg-ref-program__bot__X7pQ2m',
  {
    campaignId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__campaign__8Hn4Lx', {
        customMeta: { title: 'Кампания' },
        onDelete: 'none'
      })
    ),
    tokenEncrypted: Heap.Optional(Heap.String({ customMeta: { title: 'Зашифрованный токен' } })),
    tgBotId: Heap.Optional(Heap.String({ customMeta: { title: 'Telegram Bot ID' } })),
    username: Heap.Optional(Heap.String({ customMeta: { title: 'Username бота' } })),
    title: Heap.Optional(Heap.String({ customMeta: { title: 'Название' } })),
    webhookUrl: Heap.Optional(Heap.String({ customMeta: { title: 'URL webhook' } })),
    webhookStatus: Heap.Optional(
      Heap.String({ customMeta: { title: 'Статус webhook', description: 'ok | error | pending' } })
    )
  },
  { customMeta: { title: 'Telegram боты', description: 'Боты кампаний' } }
)

export default TSaasTgRefBotX7pQ2m

export type TSaasTgRefBotX7pQ2mRow = typeof TSaasTgRefBotX7pQ2m.T
export type TSaasTgRefBotX7pQ2mRowJson = typeof TSaasTgRefBotX7pQ2m.JsonT
