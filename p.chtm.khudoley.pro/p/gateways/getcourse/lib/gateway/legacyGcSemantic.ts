/**
 * Семантика ответа Legacy GetCourse при HTTP 2xx (manual §2.8.2 L1–L4).
 */

export type LegacyGcSemanticRule =
  | 'legacy_root_success_false'
  | 'legacy_root_error_string'
  | 'legacy_result_limit_error'
  | 'legacy_result_error_flag'
  | 'legacy_result_success_false'

function normalizeLegacyBool(value: unknown): boolean | 'missing' {
  if (value === undefined) return 'missing'
  if (value === true) return true
  if (value === false) return false
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const t = value.trim().toLowerCase()
    if (t === '' || t === '0' || t === 'false' || t === 'no') return false
    if (t === '1' || t === 'true' || t === 'yes') return true
    return 'missing'
  }
  return 'missing'
}

/**
 * Если сработало L1–L4 — возвращает правило для error.details.gcRule; иначе null (успех по семантике Legacy).
 */
export function detectLegacySemanticErrorRule(gcJson: unknown): LegacyGcSemanticRule | null {
  if (typeof gcJson !== 'object' || gcJson === null || Array.isArray(gcJson)) {
    return null
  }
  const o = gcJson as Record<string, unknown>

  const successNorm = 'success' in o ? normalizeLegacyBool(o.success) : 'missing'
  const l1 = successNorm === false

  const errStr = typeof o.error === 'string' ? o.error.trim() : ''
  const l2 = errStr !== '' && (l1 || !('success' in o))

  const result = o.result
  let l3 = false
  let l3limit = false
  let l4 = false
  if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
    const r = result as Record<string, unknown>
    if (r.error === true || r.error === 1) {
      // GC возвращает текст «лимит» на русском; латинский «limit» не используется
      if (typeof r.error_message === 'string' && /лимит/i.test(r.error_message)) {
        l3limit = true
      } else {
        l3 = true
      }
    }
    const rs = 'success' in r ? normalizeLegacyBool(r.success) : 'missing'
    if (rs === false) {
      l4 = true
    }
  }

  if (l1) return 'legacy_root_success_false'
  if (l2) return 'legacy_root_error_string'
  if (l3limit) return 'legacy_result_limit_error'
  if (l3) return 'legacy_result_error_flag'
  if (l4) return 'legacy_result_success_false'
  return null
}
