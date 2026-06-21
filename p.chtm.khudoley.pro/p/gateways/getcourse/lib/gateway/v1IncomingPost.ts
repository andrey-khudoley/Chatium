import { GW_MAX_REQUEST_BODY_BYTES } from './constants'
import { GW_HEADER_SCHOOL_API_KEY, GW_HEADER_SCHOOL_HOST } from '../../shared/gatewayHttpHeaders'
import { validateGcSchoolHostTrimmed } from '../../shared/gcSchoolHostValidation'

export function readHeaderInsensitive(headers: unknown, canonical: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined
  const h = headers as Record<string, string | string[] | undefined>
  const want = canonical.toLowerCase()
  for (const key of Object.keys(h)) {
    if (key.toLowerCase() === want) {
      const v = h[key]
      if (Array.isArray(v)) return (v[v.length - 1] ?? '').trim()
      return typeof v === 'string' ? v.trim() : undefined
    }
  }
  return undefined
}

export function parseContentLengthBytes(headers: unknown): number | null {
  const raw = readHeaderInsensitive(headers, 'Content-Length')
  if (raw === undefined || raw === '') return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function measureSerializedBodyBytes(body: unknown): number {
  if (body === undefined || body === null) return 0
  if (typeof body === 'string') return new TextEncoder().encode(body).length
  try {
    return new TextEncoder().encode(JSON.stringify(body)).length
  } catch {
    return GW_MAX_REQUEST_BODY_BYTES + 1
  }
}

export function isApplicationJsonContentType(headers: unknown): boolean {
  const ct = readHeaderInsensitive(headers, 'Content-Type')
  if (!ct) return false
  const lower = ct.toLowerCase()
  const parts = lower.split(';').map((p) => p.trim())
  if (parts[0] !== 'application/json') return false
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    if (part && part.startsWith('charset=')) {
      const cs = part.slice('charset='.length).trim().toLowerCase()
      if (cs !== 'utf-8') return false
    }
  }
  return true
}

export type SchoolHeadersParsed =
  | { ok: true; schoolHost: string; schoolApiKey: string }
  | {
      ok: false
      code:
        | 'INVOKE_SCHOOL_HOST_MISSING'
        | 'INVOKE_SCHOOL_HOST_INVALID'
        | 'INVOKE_SCHOOL_KEY_MISSING'
        | 'INVOKE_SCHOOL_KEY_INVALID'
      hint?: string
    }

export function parseSchoolHeaders(headers: unknown): SchoolHeadersParsed {
  const hostRaw = readHeaderInsensitive(headers, GW_HEADER_SCHOOL_HOST)
  if (hostRaw === undefined || hostRaw === '') {
    return { ok: false, code: 'INVOKE_SCHOOL_HOST_MISSING' }
  }
  const hostErr = validateGcSchoolHostTrimmed(hostRaw)
  if (hostErr) {
    const hint =
      hostRaw.toLowerCase().includes('http://') || hostRaw.toLowerCase().includes('https://')
        ? 'уберите https:// из значения'
        : undefined
    return { ok: false, code: 'INVOKE_SCHOOL_HOST_INVALID', ...(hint ? { hint } : {}) }
  }

  const keyRaw = readHeaderInsensitive(headers, GW_HEADER_SCHOOL_API_KEY)
  if (keyRaw === undefined) {
    return { ok: false, code: 'INVOKE_SCHOOL_KEY_MISSING' }
  }
  const keyTrim = keyRaw.trim()
  if (keyTrim === '') {
    return { ok: false, code: 'INVOKE_SCHOOL_KEY_INVALID' }
  }
  return { ok: true, schoolHost: hostRaw.trim(), schoolApiKey: keyTrim }
}

export function extractJsonObjectArgs(
  body: unknown
): { ok: true; args: Record<string, unknown> } | { ok: false } {
  if (body === undefined || body === null) {
    return { ok: false }
  }
  if (typeof body === 'object' && !Array.isArray(body)) {
    return { ok: true, args: body as Record<string, unknown> }
  }
  return { ok: false }
}
