import { Heap } from '@app/heap'

export const ORDER_STATUS_ENUM = {
  new: 'new',
  pending: 'pending',
  part_paid: 'part_paid',
  paid: 'paid',
  cancelled: 'cancelled',
  failed: 'failed'
} as const

export type OrderStatus = (typeof ORDER_STATUS_ENUM)[keyof typeof ORDER_STATUS_ENUM]

export const Orders = Heap.Table('t__neso_meta_gc_iface__orders__xP9mR4', {
  orderKey: Heap.String({ customMeta: { title: 'Ключ заказа' } }),
  idempotencyKey: Heap.String({ customMeta: { title: 'Ключ идемпотентности' } }),
  gcDealId: Heap.String({ customMeta: { title: 'ID сделки GC' } }),
  gcDealNumber: Heap.String({ customMeta: { title: 'Номер сделки GC' } }),
  offerId: Heap.String({ customMeta: { title: 'ID оффера' } }),
  userEmail: Heap.String({ customMeta: { title: 'Email покупателя' } }),
  firstName: Heap.String({ customMeta: { title: 'Имя' } }),
  lastName: Heap.String({ customMeta: { title: 'Фамилия' } }),
  phone: Heap.String({ customMeta: { title: 'Телефон' } }),
  utmSource: Heap.String({ customMeta: { title: 'UTM Source' } }),
  utmMedium: Heap.String({ customMeta: { title: 'UTM Medium' } }),
  utmCampaign: Heap.String({ customMeta: { title: 'UTM Campaign' } }),
  utmContent: Heap.String({ customMeta: { title: 'UTM Content' } }),
  utmTerm: Heap.String({ customMeta: { title: 'UTM Term' } }),
  paymentUrl: Heap.String({ customMeta: { title: 'Ссылка на оплату' } }),
  amount: Heap.Money({ customMeta: { title: 'Сумма' } }),
  status: Heap.Enum(ORDER_STATUS_ENUM, {
    customMeta: { title: 'Статус заказа' }
  }),
  rawCreateResponse: Heap.Any({ customMeta: { title: 'Ответ на создание (raw)' } }),
  rawStatus: Heap.Any({ customMeta: { title: 'Последний постбэк (raw)' } })
})

export default Orders

export type OrdersRow = typeof Orders.T
export type OrdersRowJson = typeof Orders.JsonT
