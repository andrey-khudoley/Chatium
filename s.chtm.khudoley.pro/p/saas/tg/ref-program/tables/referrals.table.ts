// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TSaasRefReferral9Xy2Zk = Heap.Table(
  't__tg-ref-program__referral__9Xy2Zk',
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
    ref: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Реферальный ID' }
      })
    ),
    tgId: Heap.Optional(Heap.String({ customMeta: { title: 'Telegram ID' } })),
    gcId: Heap.Optional(Heap.String({ customMeta: { title: 'GetCourse ID' } })),
    name: Heap.Optional(Heap.String({ customMeta: { title: 'Имя' } })),
    email: Heap.Optional(Heap.String({ customMeta: { title: 'Email' } })),
    phone: Heap.Optional(Heap.String({ customMeta: { title: 'Телефон' } })),
    registeredAt: Heap.Optional(
      Heap.DateTime({
        customMeta: { title: 'Дата регистрации' }
      })
    )
  },
  { customMeta: { title: 'Рефералы', description: 'Клиенты (рефералы партнёров)' } }
)

export default TSaasRefReferral9Xy2Zk

export type TSaasRefReferral9Xy2ZkRow = typeof TSaasRefReferral9Xy2Zk.T
export type TSaasRefReferral9Xy2ZkRowJson = typeof TSaasRefReferral9Xy2Zk.JsonT
