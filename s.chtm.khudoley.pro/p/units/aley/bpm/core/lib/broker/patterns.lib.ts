import { BrokerSemanticError } from './errorCodes.lib'

const EVENT_TYPE_RE = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/
const MODULE_PATTERN_RE = /^[a-zA-Z0-9_./-]+(?:\*)?$/
const NAME_RE = /^[a-z0-9._-]{1,128}$/

export function normalizeString(value: unknown, field: string, max = 500): string {
  const s = typeof value === 'string' ? value.trim() : ''
  if (!s) throw new BrokerSemanticError('invalid_request', `${field} is required`, { field })
  if (s.length > max) {
    throw new BrokerSemanticError('invalid_request', `${field} is too long`, { field, max })
  }
  return s
}

export function normalizeOptionalString(value: unknown, max = 500): string {
  if (value === undefined || value === null) return ''
  return String(value).trim().slice(0, max)
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.floor(n)))
}

export function validateEventType(eventType: string): void {
  if (!EVENT_TYPE_RE.test(eventType)) {
    throw new BrokerSemanticError('invalid_filter', 'Invalid event type', { eventType })
  }
}

export function validateSubscriptionName(name: string): void {
  if (!NAME_RE.test(name) || name.includes(':') || name.includes('/')) {
    throw new BrokerSemanticError('invalid_request', 'Invalid subscription name', { name })
  }
}

export function validatePattern(pattern: string): void {
  if (!pattern || !MODULE_PATTERN_RE.test(pattern) || pattern.includes('**')) {
    throw new BrokerSemanticError('invalid_filter', 'Invalid broker pattern', { pattern })
  }
}

export function patternMatches(pattern: string, value: string): boolean {
  if (!pattern || pattern === '*') return true
  if (pattern.endsWith('*')) return value.startsWith(pattern.slice(0, -1))
  return pattern === value
}

export function anyPatternMatches(patterns: string[], value: string): boolean {
  return patterns.some((pattern) => patternMatches(pattern, value))
}

export function isAllowedByPatterns(patterns: string[], value: string): boolean {
  if (!patterns.length) return false
  return anyPatternMatches(patterns, value)
}
