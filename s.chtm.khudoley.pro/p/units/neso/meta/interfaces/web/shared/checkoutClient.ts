// @shared
/**
 * Клиентские типы checkout flow: состояния формы, WebSocket-сообщения, HTTP-ответ статуса.
 * Без импортов tables/, repos/, lib/ — безопасно использовать в Vue.
 */

/** Поля формы оформления заказа, вводимые пользователем. */
export type CheckoutFormFields = {
  email: string
  offerId?: string
  amount: string
  currency?: string
  firstName?: string
  lastName?: string
  phone?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  comment?: string
  sourceUrl?: string
  returnUrl?: string
}

/** Состояние клиентского компонента checkout. */
export type CheckoutClientState =
  | 'idle'
  | 'submitting'
  | 'waiting_payment_url'
  | 'redirecting'
  | 'error'

/** Тип WebSocket-сообщения checkout. */
export type CheckoutSocketMessage =
  | { type: 'checkout_submitted'; data: { requestKey: string } }
  | {
      type: 'payment_ready'
      data: { requestKey: string; paymentUrl: string; orderKey?: string; gcDealNumber?: string }
    }
  | { type: 'checkout_failed'; data: { requestKey: string; error: string } }

/** HTTP-ответ api/checkout/status. */
export type CheckoutStatusResponse = {
  success: boolean
  status: string
  paymentUrl?: string
  error?: string
}
