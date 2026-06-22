import type { CheckoutSocketMessage } from '../../shared/checkoutClient'

/** Сообщение: checkout принят, событие опубликовано. */
export function buildCheckoutSubmittedMessage(requestKey: string): CheckoutSocketMessage {
  return {
    type: 'checkout_submitted',
    data: { requestKey }
  }
}

/** Сообщение: получена ссылка на оплату. */
export function buildPaymentReadyMessage(
  requestKey: string,
  paymentUrl: string,
  orderKey?: string,
  gcDealNumber?: string
): CheckoutSocketMessage {
  return {
    type: 'payment_ready',
    data: { requestKey, paymentUrl, orderKey, gcDealNumber }
  }
}

/** Сообщение: ошибка обработки checkout. */
export function buildCheckoutFailedMessage(
  requestKey: string,
  error: string
): CheckoutSocketMessage {
  return {
    type: 'checkout_failed',
    data: { requestKey, error }
  }
}
