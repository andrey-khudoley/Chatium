/**
 * Плоские query-параметры для GET /v1/{op}: дубликаты ключей → последнее значение (manual §3.5).
 */

function coerceQueryString(v: string): unknown {
  const t = v.trim()
  if (t === 'true') return true
  if (t === 'false') return false
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(t) && !/[.]/.test(t)) {
    const n = Number(t)
    if (Number.isFinite(n)) return n
  }
  if (/^-?\d+\.\d+/.test(t)) {
    const n = Number(t)
    if (Number.isFinite(n)) return n
  }
  if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('{') && t.endsWith('}'))) {
    try {
      return JSON.parse(t) as unknown
    } catch {
      return v
    }
  }
  return v
}

/** Преобразует `req.query` платформы в объект args для валидации и прокси к GC. */
export function parseFlatQueryArgs(
  query: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!query || typeof query !== 'object') return {}
  const out: Record<string, unknown> = {}
  for (const [k, raw] of Object.entries(query)) {
    const last = Array.isArray(raw) ? raw[raw.length - 1] : raw
    if (typeof last !== 'string') continue
    out[k] = coerceQueryString(last)
  }
  return out
}
