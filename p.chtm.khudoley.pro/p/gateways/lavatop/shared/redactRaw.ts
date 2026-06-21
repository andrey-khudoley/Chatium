// @shared
/**
 * Глубокая (рекурсивная) маскировка PII и удаление секретов для записи
 * сырых payload в журналы gateway (gatewayRequestLog.rawArgs/rawHeadersSafe,
 * gatewayUpstreamLog.rawLpJson, lavatopWebhookEvent.payload_json при показе).
 *
 * Адаптировано из `p/gateways/lifepay/shared/redactRaw.ts` под специфику Lava.Top:
 * в SECRET_KEYS_DEEP добавлены `x-lava-apikey` и `x-api-key`.
 */

/** Лимит размера сериализованного payload, байт. */
export const MAX_RAW_BYTES = 64 * 1024

/** Ключи-секреты, которые удаляются на любом уровне (case-insensitive). */
const SECRET_KEYS_DEEP = new Set<string>([
  'apikey',
  'api_key',
  'token',
  'lava_apikey',
  'lava_api_key',
  'lava_webhook_secret',
  'webhook_secret',
  'authorization',
  'x-lava-apikey',
  'x-api-key',
  'cookie',
  'set-cookie'
])

const PII_KEYS_DEEP = new Set<string>([
  'email',
  'customeremail',
  'useremail',
  'buyeremail',
  'phone',
  'customerphone',
  'userphone',
  'tel',
  'passport',
  'inn',
  'snils',
  'card',
  'cardnumber',
  'birthday',
  'birthdate',
  'dob',
  'fio',
  'fullname',
  'firstname',
  'lastname',
  'middlename',
  'address'
])

const EMAIL_KEYS = new Set<string>(['email', 'customeremail', 'useremail', 'buyeremail'])
const PHONE_KEYS = new Set<string>(['phone', 'customerphone', 'userphone', 'tel'])

/** Маскировка email: a@b.c → a***@b***.c. */
function redactEmail(email: string): string {
  if (typeof email !== 'string' || !email.includes('@')) return '***'
  const [local = '', domain] = email.split('@', 2)
  const localMasked = local.length > 0 ? `${local.charAt(0)}***` : '***'
  if (!domain || !domain.includes('.')) return `${localMasked}@***`
  const lastDot = domain.lastIndexOf('.')
  const domainName = domain.slice(0, lastDot)
  const tld = domain.slice(lastDot + 1)
  const domainMasked = domainName.length > 0 ? `${domainName.charAt(0)}***.${tld}` : `***.${tld}`
  return `${localMasked}@${domainMasked}`
}

/** Маскировка телефона до последних 4 цифр. */
function redactPhone(phone: string): string {
  if (typeof phone !== 'string') return '***'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  return `+7***${digits.slice(-4)}`
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null) return null
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return value
  if (t === 'function' || t === 'symbol' || t === 'undefined' || t === 'bigint') {
    return '__nonSerializable'
  }
  if (typeof value !== 'object') return '__nonSerializable'

  if (seen.has(value as object)) return '__circular'
  seen.add(value as object)

  if (Array.isArray(value)) {
    const out: unknown[] = []
    for (const item of value) out.push(redactValue(item, seen))
    return out
  }

  const src = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(src)) {
    const lk = k.toLowerCase()
    if (SECRET_KEYS_DEEP.has(lk)) continue
    if (PII_KEYS_DEEP.has(lk)) {
      if (EMAIL_KEYS.has(lk)) {
        out[k] = typeof v === 'string' ? redactEmail(v) : '***'
        continue
      }
      if (PHONE_KEYS.has(lk)) {
        out[k] = typeof v === 'string' ? redactPhone(v) : '***'
        continue
      }
      out[k] = typeof v === 'string' || typeof v === 'number' ? '***' : `***(${typeof v})`
      continue
    }
    out[k] = redactValue(v, seen)
  }
  return out
}

/**
 * Глубокая маскировка JSON-payload + усечение по размеру.
 * Возвращает либо отредактированное значение, либо marker
 * `{ __truncated: true, __originalBytes, __preview }`.
 */
export function redactRawDeep(value: unknown): unknown {
  const seen = new WeakSet<object>()
  const redacted = redactValue(value, seen)

  let serialized: string
  try {
    serialized = JSON.stringify(redacted)
  } catch {
    return { __truncated: true, __originalBytes: 0, __preview: '<unstringifiable>' }
  }

  if (serialized.length > MAX_RAW_BYTES) {
    return {
      __truncated: true,
      __originalBytes: serialized.length,
      __preview: serialized.slice(0, MAX_RAW_BYTES)
    }
  }

  return redacted
}
