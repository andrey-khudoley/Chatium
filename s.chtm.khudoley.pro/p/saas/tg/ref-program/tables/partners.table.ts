// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TSaasRefProgramPartner3Ab7Cd = Heap.Table(
  't__tg-ref-program__partner__3Ab7Cd',
  {
    campaignId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__campaign__8Hn4Lx', {
        customMeta: { title: 'Кампания' },
        onDelete: 'none'
      })
    ),
    tgId: Heap.Optional(Heap.String({ customMeta: { title: 'Telegram ID' } })),
    username: Heap.Optional(Heap.String({ customMeta: { title: 'Username' } })),
    fullName: Heap.Optional(Heap.String({ customMeta: { title: 'Полное имя' } })),
    stats: Heap.Optional(
      Heap.Any({ customMeta: { title: 'Статистика', description: 'Агрегированные показатели' } })
    )
  },
  { customMeta: { title: 'Партнёры', description: 'Партнёры кампании (Telegram)' } }
)

export default TSaasRefProgramPartner3Ab7Cd

export type TSaasRefProgramPartner3Ab7CdRow = typeof TSaasRefProgramPartner3Ab7Cd.T
export type TSaasRefProgramPartner3Ab7CdRowJson = typeof TSaasRefProgramPartner3Ab7Cd.JsonT
