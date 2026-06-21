export type LavaCurrency = 'RUB' | 'USD' | 'EUR'

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

export type LavaWebhookEventType =
  | 'payment.success'
  | 'payment.failed'
  | 'subscription.recurring.payment.success'
  | 'subscription.recurring.payment.failed'
  | 'subscription.cancelled'

export type LocalContractStatus =
  | 'created'
  | 'in_progress'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'unknown'

export interface PaymentLinkRequest {
  gcOrderId: string
  gcUserId?: string
  buyerEmail: string
  amount: number
  currency: LavaCurrency
  /** Текст предложения GetCourse (offer). */
  gcOfferTitle?: string
  /**
   * Название продукта/пакета GetCourse (product) — передаётся в Lava PATCH как `offers[].name`.
   */
  gcProductTitle?: string
  description?: string
  paymentProvider?: string
  paymentMethod?: string
  buyerLanguage?: string
  utm?: Record<string, string>
  requestId?: string
}

export interface PaymentLinkResponse {
  success: boolean
  gcOrderId?: string
  lavaContractId?: string
  paymentUrl?: string
  status?: string
  errorCode?: string
  message?: string
  /** Нижняя граница суммы оффера для Lava (PATCH), при `AMOUNT_OUT_OF_RANGE`. */
  amountMin?: number
  /** Верхняя граница суммы оффера для Lava (PATCH), при `AMOUNT_OUT_OF_RANGE`. */
  amountMax?: number
  /** Входная сумма в RUB до конвертации (при `USD`/`EUR`). */
  sourceAmountRub?: number
  /** Сумма в валюте оффера после конвертации (при `USD`/`EUR`). */
  convertedAmount?: number
  /** Ответ без Lava при `integrationTestDryRun: true` в теле и валидном сервисном токене */
  integrationTestDryRun?: boolean
}

export interface LavaWebhookPayload {
  eventType: LavaWebhookEventType
  product?: { id: string; title: string }
  contractId: string
  parentContractId?: string
  buyer?: { email: string }
  amount: number
  currency: LavaCurrency
  status: LavaContractStatus
  timestamp: string
  clientUtm?: Record<string, string>
  errorMessage?: string
}
