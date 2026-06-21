// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TSaasRefProgramPayment7Hi8Jk = Heap.Table(
  't__tg-ref-program__payment__7Hi8Jk',
  {
    campaignId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__campaign__8Hn4Lx', {
        customMeta: { title: 'Кампания' },
        onDelete: 'none'
      })
    ),
    ref: Heap.Optional(Heap.String({ customMeta: { title: 'Реферальный ID' } })),
    orderId: Heap.Optional(Heap.String({ customMeta: { title: 'ID заказа' } })),
    paymentSum: Heap.Optional(
      Heap.Number({
        customMeta: { title: 'Сумма оплаты в копейках' }
      })
    ),
    rawPayload: Heap.Optional(Heap.Any({ customMeta: { title: 'Исходные данные' } }))
  },
  { customMeta: { title: 'Оплаты', description: 'События оплат' } }
)

export default TSaasRefProgramPayment7Hi8Jk

export type TSaasRefProgramPayment7Hi8JkRow = typeof TSaasRefProgramPayment7Hi8Jk.T
export type TSaasRefProgramPayment7Hi8JkRowJson = typeof TSaasRefProgramPayment7Hi8Jk.JsonT
