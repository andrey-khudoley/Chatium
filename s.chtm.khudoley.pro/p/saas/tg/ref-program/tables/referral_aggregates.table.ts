import { Heap } from '@app/heap'

/**
 * Агрегированные данные по рефералу (заказы/оплаты).
 * Одна запись на реферала; обновляется инкрементально и при полном пересчёте.
 */
export const ReferralAggregates = Heap.Table(
  't__tg-ref-program__refagg__2Xy9Zk',
  {
    referralId: Heap.RefLink('t__tg-ref-program__referral__9Xy2Zk', {
      customMeta: { title: 'Реферал' },
      onDelete: 'none'
    }),
    campaignId: Heap.RefLink('t__tg-ref-program__campaign__8Hn4Lx', {
      customMeta: { title: 'Кампания' },
      onDelete: 'none'
    }),
    ordersCount: Heap.Optional(Heap.Number({ customMeta: { title: 'Количество заказов' } })),
    ordersSum: Heap.Optional(Heap.Number({ customMeta: { title: 'Сумма заказов (коп.)' } })),
    paymentsCount: Heap.Optional(Heap.Number({ customMeta: { title: 'Количество оплат' } })),
    paymentsSum: Heap.Optional(Heap.Number({ customMeta: { title: 'Сумма оплат (коп.)' } }))
  },
  {
    customMeta: {
      title: 'Агрегаты рефералов',
      description: 'Счётчики заказов и оплат по рефералу'
    }
  }
)

export default ReferralAggregates
export type ReferralAggregatesRow = typeof ReferralAggregates.T
export type ReferralAggregatesRowJson = typeof ReferralAggregates.JsonT
