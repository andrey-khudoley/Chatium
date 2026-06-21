import { Heap } from '@app/heap'

export const LavaPaymentContract = Heap.Table('t__lava-gc-integration__payment-contract__9Xr5Bt', {
  gc_order_id: Heap.String({ customMeta: { title: 'ID заказа GetCourse' } }),
  gc_user_id: Heap.String({ customMeta: { title: 'ID пользователя GetCourse' } }),
  lava_contract_id: Heap.String({ customMeta: { title: 'ID контракта Lava' } }),
  lava_product_id: Heap.String({ customMeta: { title: 'Технический продукт Lava' } }),
  lava_offer_id: Heap.String({ customMeta: { title: 'Технический оффер Lava' } }),
  amount: Heap.Number({ customMeta: { title: 'Сумма заказа' } }),
  currency: Heap.String({ customMeta: { title: 'Валюта (RUB/USD/EUR)' } }),
  buyer_email: Heap.String({ customMeta: { title: 'Email покупателя' } }),
  /** Текст предложения из GetCourse (поле offer). */
  gc_offer_title: Heap.String({ customMeta: { title: 'Предложение GetCourse (offer)' } }),
  /** Название позиции из GetCourse (поле product); в Lava уходит в offers[].name при PATCH продукта. */
  gc_product_title: Heap.String({ customMeta: { title: 'Продукт GetCourse (product)' } }),
  payment_url: Heap.String({ customMeta: { title: 'Ссылка на оплату' } }),
  status: Heap.String({ customMeta: { title: 'Статус контракта' } }),
  request_id: Heap.String({ customMeta: { title: 'Корреляционный ID' } }),
  created_at: Heap.Number({ customMeta: { title: 'Создание (Unix ms)' } }),
  updated_at: Heap.Number({ customMeta: { title: 'Обновление (Unix ms)' } })
})

export default LavaPaymentContract

export type LavaPaymentContractRow = typeof LavaPaymentContract.T
export type LavaPaymentContractRowJson = typeof LavaPaymentContract.JsonT
