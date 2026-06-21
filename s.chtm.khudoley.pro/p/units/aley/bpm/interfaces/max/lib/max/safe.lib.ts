const SECRET_KEY_RE =
  /(token|secret|password|authorization|cookie|signature|accessToken|refreshToken|initData)/i

export function stableId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`
  const obj = value as Record<string, unknown>
  return `{${Object.keys(obj)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`)
    .join(',')}}`
}

export function stableHash(value: unknown): string {
  const text = typeof value === 'string' ? value : canonicalJson(value)
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function sanitizeJson(value: unknown, depth = 0): unknown {
  if (depth > 20) return null
  if (value === null) return null
  if (['string', 'number', 'boolean'].includes(typeof value)) {
    if (typeof value === 'string') return value.length > 12000 ? value.slice(0, 12000) : value
    return value
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeJson(item, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_RE.test(key)) continue
      out[key] = sanitizeJson(item, depth + 1)
    }
    return out
  }
  return null
}

export function safeError(value: unknown): string {
  return String(value)
    .replace(/(token|secret|password|authorization|cookie)=?[^,\s]*/gi, '$1=***')
    .slice(0, 1000)
}

export function externalId(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value))
  return ''
}

function walkFirstId(value: unknown, keys: string[]): string {
  if (typeof value !== 'object' || value === null) return ''
  const obj = value as Record<string, unknown>
  for (const key of keys) {
    const found = externalId(obj[key])
    if (found) return found
  }
  for (const item of Object.values(obj)) {
    const found = walkFirstId(item, keys)
    if (found) return found
  }
  return ''
}

export function extractChatId(update: unknown): string {
  return walkFirstId(update, ['chat_id', 'chatId'])
}

export function extractUserId(update: unknown): string {
  return walkFirstId(update, ['user_id', 'userId', 'sender_id'])
}
