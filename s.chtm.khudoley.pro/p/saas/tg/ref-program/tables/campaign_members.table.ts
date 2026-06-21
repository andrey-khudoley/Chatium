// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TSaasRefCampaignMemberPg7T2x = Heap.Table(
  't__tg-ref-program__campaign_member__Pg7T2x',
  {
    campaignId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__campaign__8Hn4Lx', {
        customMeta: { title: 'Кампания' },
        onDelete: 'none'
      })
    ),
    userId: Heap.Optional(
      Heap.UserRefLink({
        customMeta: { title: 'Пользователь' },
        onDelete: 'none'
      })
    ),
    role: Heap.Optional(Heap.String({ customMeta: { title: 'Роль' } }))
  },
  { customMeta: { title: 'Участники кампании', description: 'Участники кампании' } }
)

export default TSaasRefCampaignMemberPg7T2x

export type TSaasRefCampaignMemberPg7T2xRow = typeof TSaasRefCampaignMemberPg7T2x.T
export type TSaasRefCampaignMemberPg7T2xRowJson = typeof TSaasRefCampaignMemberPg7T2x.JsonT
