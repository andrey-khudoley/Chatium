import { GW_GC_RAW_BODY_CAP_BYTES } from './constants'
import { detectLegacySemanticErrorRule, type LegacyGcSemanticRule } from './legacyGcSemantic'
import { detectNewSemanticErrorRule, type NewGcSemanticRule } from './newGcSemantic'

export type InterpretGcOutcome =
  | { kind: 'success'; data: unknown }
  | {
      kind: 'semantic_error'
      gcContour: 'legacy'
      gcRule: LegacyGcSemanticRule
    }
  | {
      kind: 'semantic_error'
      gcContour: 'new'
      gcRule: NewGcSemanticRule
      gcNumericCode?: number
      gcErrorsCount?: number
    }
  | { kind: 'upstream_error'; gcHttpStatus: number }
  | { kind: 'json_parse_error' }

function looksLikeJsonContentType(ct: string): boolean {
  const c = ct.toLowerCase()
  return c.includes('application/json') || c.includes('+json')
}

function truncateGcRawBody(text: string): { gcRawBody: string; gcRawBodyTruncated?: true } {
  const bytes = new TextEncoder().encode(text).length
  if (bytes <= GW_GC_RAW_BODY_CAP_BYTES) {
    return { gcRawBody: text }
  }
  let out = ''
  let len = 0
  for (const ch of text) {
    const b = new TextEncoder().encode(ch).length
    if (len + b > GW_GC_RAW_BODY_CAP_BYTES) break
    out += ch
    len += b
  }
  return { gcRawBody: out, gcRawBodyTruncated: true }
}

/**
 * Транспорт и семантика ответа GetCourse (manual §2.8.1–2.8.2) для обоих контуров.
 */
export function interpretGcContourResponse(input: {
  contour: 'legacy' | 'new'
  gcStatus: number
  gcContentType: string
  gcBodyText: string
}): InterpretGcOutcome {
  const { contour, gcStatus, gcContentType, gcBodyText } = input
  if (gcStatus < 200 || gcStatus > 299) {
    return { kind: 'upstream_error', gcHttpStatus: gcStatus }
  }

  const isJsonHint = looksLikeJsonContentType(gcContentType) || /^\s*[\[{]/.test(gcBodyText)
  if (!isJsonHint) {
    const raw = truncateGcRawBody(gcBodyText)
    return {
      kind: 'success',
      data: {
        gcRawBody: raw.gcRawBody,
        gcContentType,
        ...(raw.gcRawBodyTruncated ? { gcRawBodyTruncated: true } : {})
      }
    }
  }

  let gcJson: unknown
  try {
    gcJson = JSON.parse(gcBodyText)
  } catch {
    return { kind: 'json_parse_error' }
  }

  if (contour === 'legacy') {
    const rule = detectLegacySemanticErrorRule(gcJson)
    if (rule) {
      return { kind: 'semantic_error', gcContour: 'legacy', gcRule: rule }
    }
    return { kind: 'success', data: gcJson }
  }

  const det = detectNewSemanticErrorRule(gcJson)
  if (det) {
    return {
      kind: 'semantic_error',
      gcContour: 'new',
      gcRule: det.rule,
      ...(det.gcNumericCode !== undefined ? { gcNumericCode: det.gcNumericCode } : {}),
      ...(det.gcErrorsCount !== undefined ? { gcErrorsCount: det.gcErrorsCount } : {})
    }
  }

  return { kind: 'success', data: gcJson }
}

/**
 * Legacy-only обёртка (обратная совместимость с существующими вызовами).
 */
export function interpretLegacyHttpResponse(input: {
  gcStatus: number
  gcContentType: string
  gcBodyText: string
}): InterpretGcOutcome {
  return interpretGcContourResponse({ contour: 'legacy', ...input })
}
