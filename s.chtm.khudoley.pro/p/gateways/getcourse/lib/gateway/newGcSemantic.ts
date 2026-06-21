/**
 * Семантика ответа нового API GetCourse при HTTP 2xx (manual §2.8.2 N1–N3).
 */

export type NewGcSemanticRule = 'new_status_false' | 'new_code_non_200' | 'new_data_result_false'

export type NewSemanticDetection = {
  rule: NewGcSemanticRule
  gcNumericCode?: number
  gcErrorsCount?: number
}

/**
 * Если сработало N1–N3 — возвращает правило и опциональные поля для error.details (§10).
 */
export function detectNewSemanticErrorRule(gcJson: unknown): NewSemanticDetection | null {
  if (typeof gcJson !== 'object' || gcJson === null || Array.isArray(gcJson)) {
    return null
  }
  const o = gcJson as Record<string, unknown>

  // N1
  if (typeof o.status === 'boolean' && o.status === false) {
    return { rule: 'new_status_false' }
  }

  // N2
  if (typeof o.code === 'number' && o.code !== 200) {
    const det: NewSemanticDetection = { rule: 'new_code_non_200', gcNumericCode: o.code }
    if (Array.isArray(o.errors)) {
      det.gcErrorsCount = o.errors.length
    }
    return det
  }

  // N3 — успешная обёртка, но data.result === false
  if (
    typeof o.status === 'boolean' &&
    o.status === true &&
    typeof o.code === 'number' &&
    o.code === 200 &&
    typeof o.data === 'object' &&
    o.data !== null &&
    !Array.isArray(o.data)
  ) {
    const d = o.data as Record<string, unknown>
    if (typeof d.result === 'boolean' && d.result === false) {
      return { rule: 'new_data_result_false' }
    }
  }

  return null
}
