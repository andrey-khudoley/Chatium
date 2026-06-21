// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TSaasRefPartnerLink5Cd9Ef = Heap.Table(
  't__tg-ref-program__partner_link__5Cd9Ef',
  {
    campaignId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__campaign__8Hn4Lx', {
        customMeta: { title: 'Кампания' },
        onDelete: 'none'
      })
    ),
    partnerId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__partner__3Ab7Cd', {
        customMeta: { title: 'Партнёр' },
        onDelete: 'none'
      })
    ),
    pageId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__page__4Bc8De', {
        customMeta: { title: 'Страница' },
        onDelete: 'none'
      })
    ),
    publicSlug: Heap.Optional(
      Heap.String({
        customMeta: {
          title: 'Публичный slug',
          description: 'Уникальный идентификатор для URL редиректа'
        }
      })
    )
  },
  {
    customMeta: {
      title: 'Партнёрские ссылки',
      description: 'Уникальные ссылки партнёра на страницы'
    }
  }
)

export default TSaasRefPartnerLink5Cd9Ef

export type TSaasRefPartnerLink5Cd9EfRow = typeof TSaasRefPartnerLink5Cd9Ef.T
export type TSaasRefPartnerLink5Cd9EfRowJson = typeof TSaasRefPartnerLink5Cd9Ef.JsonT
