/**
 * Типы домена Lava.Top для контура gateway. Источник истины — OpenAPI Lava.Top
 * (`p/units/aom/lava_gc_integration/docs/reference/lavatop-openapi3.yaml`).
 * Серверный модуль (НЕ `@shared`): используется в lib/gateway, lib/webhook.
 */

/** Валюты, поддерживаемые Lava.Top. */
export type LavaCurrency = 'RUB' | 'USD' | 'EUR'

/** Статус контракта/счёта Lava.Top (поле `status` в ответах и вебхуках). */
export type LavaContractStatus =
  | 'new'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'subscription-active'
  | 'subscription-expired'
  | 'subscription-cancelled'
  | 'subscription-failed'

/** Типы событий вебхука Lava.Top (раздел Webhooks OpenAPI). */
export type LavaWebhookEventType =
  | 'payment.success'
  | 'payment.failed'
  | 'subscription.recurring.payment.success'
  | 'subscription.recurring.payment.failed'
  | 'subscription.cancelled'

/**
 * Тело вебхука Lava.Top (`PurchaseWebhookLog`). `contractId` — ключ маппинга на клиентский
 * callback. Для рекуррентных платежей подписки приходит `parentContractId`. Для
 * `subscription.cancelled` — `cancelledAt`/`willExpireAt` вместо `amount`/`currency`.
 */
export interface LavaWebhookPayload {
  eventType: LavaWebhookEventType
  product?: { id: string; title: string }
  contractId: string
  parentContractId?: string
  buyer?: { email: string }
  amount?: number
  currency?: LavaCurrency
  status?: LavaContractStatus
  timestamp?: string
  errorMessage?: string
  cancelledAt?: string
  willExpireAt?: string
  clientUtm?: Record<string, unknown>
}
