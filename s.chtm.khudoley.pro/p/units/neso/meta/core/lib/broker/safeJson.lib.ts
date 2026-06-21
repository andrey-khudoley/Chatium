const SECRET_KEY_RE =
  /(token|secret|password|authorization|cookie|signature|accessToken|refreshToken|initData)/i

export function isSecretLikeKey(key: string): boolean {
  return SECRET_KEY_RE.test(key)
}

export function stableId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`).join(',')}}`
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
  if (['string', 'number', 'boolean'].includes(typeof value)) return value
  if (Array.isArray(value)) return value.map((item) => sanitizeJson(item, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (isSecretLikeKey(key)) continue
      out[key] = sanitizeJson(item, depth + 1)
    }
    return out
  }
  return null
}

export function safeError(value: unknown): string {
  const text = typeof value === 'string' ? value : String(value)
  return text
    .replace(/(token|secret|password|authorization|cookie)=?[^,\s]*/gi, '$1=***')
    .slice(0, 1000)
}

export function getByDotPath(value: unknown, path: string): unknown {
  let current = value
  for (const part of path.split('.')) {
    if (!part) return undefined
    if (Array.isArray(current)) {
      const index = Number(part)
      current = Number.isInteger(index) ? current[index] : undefined
    } else if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return current
}
