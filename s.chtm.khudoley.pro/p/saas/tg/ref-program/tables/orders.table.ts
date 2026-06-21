// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TSaasRefOrderTg5De6Fg = Heap.Table(
  't__tg-ref-program__order__5De6Fg',
  {
    campaignId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__campaign__8Hn4Lx', {
        customMeta: { title: 'Кампания' },
        onDelete: 'none'
      })
    ),
    ref: Heap.Optional(Heap.String({ customMeta: { title: 'Реферальный ID' } })),
    orderId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID заказа во внешней системе' }
      })
    ),
    productName: Heap.Optional(Heap.String({ customMeta: { title: 'Название продукта' } })),
    orderSum: Heap.Optional(
      Heap.Number({
        customMeta: { title: 'Сумма в копейках' }
      })
    ),
    rawPayload: Heap.Optional(Heap.Any({ customMeta: { title: 'Исходные данные' } }))
  },
  { customMeta: { title: 'Заказы', description: 'События заказов' } }
)

export default TSaasRefOrderTg5De6Fg

export type TSaasRefOrderTg5De6FgRow = typeof TSaasRefOrderTg5De6Fg.T
export type TSaasRefOrderTg5De6FgRowJson = typeof TSaasRefOrderTg5De6Fg.JsonT
