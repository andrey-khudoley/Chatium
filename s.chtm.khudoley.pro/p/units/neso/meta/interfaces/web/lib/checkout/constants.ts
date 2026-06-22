/** Интервал клиентского poll статуса checkout (мс). */
export const CLIENT_POLL_INTERVAL_MS = 1500

/** Максимальный batch deliveries за один poll. */
export const POLL_BATCH_LIMIT = 10

/** Максимальное число итераций fallback-джобы до остановки. */
export const FALLBACK_MAX_ITERATIONS = 40

/** Шаг перепланирования fallback-джобы. */
export const FALLBACK_RESCHEDULE_STEP = { amount: 3, unit: 'seconds' } as const

/** Валюта по умолчанию. */
export const DEFAULT_CURRENCY = 'RUB'

/** Терминальные статусы checkout request — дальнейшая обработка не нужна. */
export const TERMINAL_STATUSES: readonly string[] = ['payment_ready', 'redirected', 'failed']

// ---------------------------------------------------------------------------
// Строительные функции ключей
// ---------------------------------------------------------------------------

/** Ключ идемпотентности checkout request: стабильный per requestKey. */
export function buildIdempotencyKey(requestKey: string): string {
  return `web-checkout:${requestKey}`
}

/** Raw socketId канала checkout: передаётся в sendDataToSocket (НЕ закодированный). */
export function buildSocketId(requestKey: string): string {
  return `checkout:${requestKey}`
}

/** Ключ идемпотентности broker-события web.checkout.submitted. */
export function buildEventIdempotencyKey(requestKey: string): string {
  return `web-checkout-submitted:${requestKey}`
}
