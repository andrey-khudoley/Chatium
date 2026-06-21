// @shared
/**
 * Имена сокет-каналов уведомлений об оплате для интеграционного JS.
 *
 * Сценарий: внешний JS (или вкладка панели) получает encodedSocketId от
 * `POST /api/gateways/payment-socket?correlationId=<id>` и через
 * `@app/socket.getOrCreateBrowserSocketClient().subscribeToData(...)` слушает
 * сообщения. Сервер публикует в этот канал из webhook-приёмников
 * (`webhooks/lifepay` для LifePay и `webhooks/lavatop` для Lava.Top) при
 * получении соответствующего вебхука по тому же `correlationId`.
 *
 * Ключ `correlationId`:
 *   - LifePay — берётся из query-параметра `callbackUrl` (механизм связки
 *     request_log ↔ webhook_log, см. `shared/correlation.ts`).
 *   - Lava.Top — берётся из поля `clientOrderId` тела вебхука (это поле под
 *     управлением магазина: в `createInvoice.args` его выставляет вызывающий JS).
 */

/** Префикс канала уведомлений об оплате. */
export const PAYMENT_SOCKET_PREFIX = 'pay-payment'

/**
 * Сырое имя канала `sendDataToSocket(ctx, channel, data)` для уведомлений
 * об оплате по конкретному `correlationId`. Возвращает пустую строку, если
 * `correlationId` пустой/невалидный — публикация в таком случае не делается.
 */
export function paymentSocketChannel(correlationId: string | null | undefined): string {
  if (typeof correlationId !== 'string') return ''
  const trimmed = correlationId.trim()
  if (!trimmed) return ''
  return `${PAYMENT_SOCKET_PREFIX}-${trimmed}`
}

/** Допустимый набор символов для `correlationId` (защита от мусора в имени канала). */
const CORRELATION_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/

/** Поверхностная валидация correlationId как ключа канала. */
export function isValidCorrelationId(value: unknown): value is string {
  return typeof value === 'string' && CORRELATION_ID_RE.test(value.trim())
}

/** Типы сообщений, публикуемых в канале уведомлений об оплате. */
export type PaymentSocketMessage = {
  type: 'payment'
  data: {
    /** Идентификатор upstream-гейтвея, от которого пришёл webhook. */
    gatewayId: 'lifepay' | 'lavatop'
    /** Совпадает с тем, что передал клиент при создании платежа. */
    correlationId: string
    /** Сводный статус из webhook (success / fail / иной строкой). */
    status: string
    /** Тип события из webhook (payment / refund / eventType Lava.Top). */
    eventType: string
    /** Внешний идентификатор транзакции в upstream-гейтвее (для дебага). */
    externalId: string
    /** orderNumber/clientOrderId из тела webhook, если есть. */
    orderNumber: string
    /** Сумма (строкой, как пришла). */
    amount: string
    /** Метка времени публикации (Unix ms). */
    timestamp: number
  }
}
