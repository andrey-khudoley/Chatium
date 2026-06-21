// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TSaasRefProgramCampaign8Hn4Lx = Heap.Table(
  't__tg-ref-program__campaign__8Hn4Lx',
  {
    title: Heap.Optional(Heap.String({ customMeta: { title: 'Название' } })),
    ownerUserId: Heap.Optional(
      Heap.UserRefLink({
        customMeta: { title: 'Владелец' },
        onDelete: 'none'
      })
    ),
    webhookSecret: Heap.Optional(Heap.String({ customMeta: { title: 'Секрет webhook' } })),
    settings: Heap.Optional(Heap.Any()),
    isDeleted: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Удалена' } }))
  },
  { customMeta: { title: 'Кампании', description: 'Кампании' } }
)

export default TSaasRefProgramCampaign8Hn4Lx

export type TSaasRefProgramCampaign8Hn4LxRow = typeof TSaasRefProgramCampaign8Hn4Lx.T
export type TSaasRefProgramCampaign8Hn4LxRowJson = typeof TSaasRefProgramCampaign8Hn4Lx.JsonT
