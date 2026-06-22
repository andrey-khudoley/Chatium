import { Heap } from '@app/heap'

/**
 * Статусы checkout request.
 * 'new' — зарезервирован для совместимости; строки в этом статусе не создаются
 * (стартовый статус при submit = 'submitted', §7.1 spec).
 */
export const CHECKOUT_REQUEST_STATUS_ENUM = {
  new: 'new',
  submitted: 'submitted',
  payment_ready: 'payment_ready',
  redirected: 'redirected',
  failed: 'failed'
} as const

export type CheckoutRequestStatus =
  (typeof CHECKOUT_REQUEST_STATUS_ENUM)[keyof typeof CHECKOUT_REQUEST_STATUS_ENUM]

export const CheckoutRequests = Heap.Table('t__neso_meta_web_iface__checkout_requests__rQ8pN4', {
  requestKey: Heap.String({ customMeta: { title: 'Ключ checkout request' } }),
  idempotencyKey: Heap.String({ customMeta: { title: 'Ключ идемпотентности' } }),
  socketId: Heap.String({ customMeta: { title: 'Raw socket id (checkout:{requestKey})' } }),
  status: Heap.Enum(CHECKOUT_REQUEST_STATUS_ENUM, {
    customMeta: { title: 'Статус' }
  }),
  formPayload: Heap.Any({ customMeta: { title: 'Поля формы после нормализации' } }),
  paymentUrl: Heap.String({ customMeta: { title: 'Ссылка на оплату' } }),
  orderKey: Heap.String({ customMeta: { title: 'orderKey GetCourse interface' } }),
  gcDealNumber: Heap.String({ customMeta: { title: 'Номер сделки GC' } }),
  errorMessage: Heap.String({ customMeta: { title: 'Последняя ошибка' } })
})

export default CheckoutRequests

export type CheckoutRequestsRow = typeof CheckoutRequests.T
export type CheckoutRequestsRowJson = typeof CheckoutRequests.JsonT
