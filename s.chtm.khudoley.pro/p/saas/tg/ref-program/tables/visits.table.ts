// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TSaasRefVisit1Vw7Kx = Heap.Table(
  't__tg-ref-program__visit__1Vw7Kx',
  {
    campaignId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__campaign__8Hn4Lx', {
        customMeta: { title: 'Кампания' },
        onDelete: 'none'
      })
    ),
    partnerLinkId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__partner_link__5Cd9Ef', {
        customMeta: { title: 'Партнёрская ссылка' },
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
    ref: Heap.Optional(
      Heap.String({
        customMeta: {
          title: 'Реферальный ID',
          description: 'Уникальный в рамках кампании идентификатор визита'
        }
      })
    ),
    fingerprintHash: Heap.Optional(
      Heap.String({
        customMeta: {
          title: 'Хеш fingerprint',
          description: 'Хеш для дедупликации визитов'
        }
      })
    ),
    fingerprintParts: Heap.Optional(
      Heap.Any({
        customMeta: {
          title: 'Компоненты fingerprint',
          description: 'ip, userAgent, acceptLanguage и т.д.'
        }
      })
    ),
    clickedAt: Heap.Optional(
      Heap.DateTime({
        customMeta: { title: 'Время клика' }
      })
    ),
    registeredAt: Heap.Optional(
      Heap.DateTime({
        customMeta: {
          title: 'Время регистрации',
          description: 'Заполняется при регистрации (фича 5)'
        }
      })
    )
  },
  { customMeta: { title: 'Визиты', description: 'Клики по партнёрским ссылкам' } }
)

export default TSaasRefVisit1Vw7Kx

export type TSaasRefVisit1Vw7KxRow = typeof TSaasRefVisit1Vw7Kx.T
export type TSaasRefVisit1Vw7KxRowJson = typeof TSaasRefVisit1Vw7Kx.JsonT
