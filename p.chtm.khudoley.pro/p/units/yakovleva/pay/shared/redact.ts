// @shared
/**
 * Маскировка PII для записи в журнал (implementation-plan §1.8.1).
 * Секреты `apikey`, `login`, `webhook_token` НЕ должны попадать в `argsRedacted`
 * — этого добиваемся фильтрацией ключей `redactArgsForLog`.
 */

const SECRET_KEYS = new Set([
  'apikey',
  'login',
  'token',
  'lp_apikey',
  'lp_login',
  'lp_webhook_token'
])

/** Маскировать email: a@b.c → a***@b***.c (первый символ + домен инициал). */
export function redactEmail(email: string): string {
  if (typeof email !== 'string' || !email.includes('@')) return '***'
  const [local, domain] = email.split('@', 2)
  const localMasked = local && local.length > 0 ? `${local.charAt(0)}***` : '***'
  if (!domain || !domain.includes('.')) {
    return `${localMasked}@***`
  }
  const lastDot = domain.lastIndexOf('.')
  const domainName = domain.slice(0, lastDot)
  const tld = domain.slice(lastDot + 1)
  const domainMasked = domainName.length > 0 ? `${domainName.charAt(0)}***.${tld}` : `***.${tld}`
  return `${localMasked}@${domainMasked}`
}

/** Маскировать телефон формата 7XXXXXXXXXX или +7XXXXXXXXXX → +7***XXXX (последние 4). */
export function redactPhone(phone: string): string {
  if (typeof phone !== 'string') return '***'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  const last4 = digits.slice(-4)
  return `+7***${last4}`
}

/**
 * Сформировать argsRedacted для записи в `request_log`.
 *
 * - Удаляет известные ключи-секреты (`apikey`, `login`, `token`...).
 * - Маскирует `customerEmail`, `email` → `redactEmail`.
 * - Маскирует `customerPhone`, `phone` → `redactPhone`.
 * - Прочие поля оставляет как есть (числа, строки).
 */
export function redactArgsForLog(args: unknown): Record<string, unknown> {
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    return { __nonObject: typeof args }
  }
  const src = args as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(src)) {
    const lk = key.toLowerCase()
    if (SECRET_KEYS.has(lk)) {
      continue
    }
    if (lk === 'customeremail' || lk === 'email') {
      out[key] = typeof value === 'string' ? redactEmail(value) : '***'
      continue
    }
    if (lk === 'customerphone' || lk === 'phone') {
      out[key] = typeof value === 'string' ? redactPhone(value) : '***'
      continue
    }
    out[key] = value
  }
  return out
}

/** Извлечь orderNumber из args (для индексирования в request_log). */
export function extractOrderNumber(args: unknown): string {
  if (typeof args !== 'object' || args === null) return ''
  const o = args as Record<string, unknown>
  const v = o.orderNumber
  return typeof v === 'string' ? v : ''
}
