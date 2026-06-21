// Таблица приглашений в кампанию (токен, срок действия, принятие).
import { Heap } from '@app/heap'

export const TSaasRefCampaignInviteP2K8mN = Heap.Table(
  't__tg-ref-program__campaign_invite__p2K8mN',
  {
    campaignId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__campaign__8Hn4Lx', {
        customMeta: { title: 'Кампания' },
        onDelete: 'none'
      })
    ),
    token: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Токен приглашения', description: 'Уникальный токен для ссылки' }
      })
    ),
    createdByUserId: Heap.Optional(
      Heap.UserRefLink({
        customMeta: { title: 'Кто создал' },
        onDelete: 'none'
      })
    ),
    expiresAt: Heap.Optional(
      Heap.DateTime({
        customMeta: { title: 'Истекает' }
      })
    ),
    acceptedAt: Heap.Optional(
      Heap.DateTime({
        customMeta: { title: 'Принято' },
        description: 'Когда приглашение было принято; null = не использовано'
      })
    )
  },
  { customMeta: { title: 'Приглашения в кампанию', description: 'Приглашения по токену' } }
)

export default TSaasRefCampaignInviteP2K8mN

export type TSaasRefCampaignInviteP2K8mNRow = typeof TSaasRefCampaignInviteP2K8mN.T
export type TSaasRefCampaignInviteP2K8mNRowJson = typeof TSaasRefCampaignInviteP2K8mN.JsonT
