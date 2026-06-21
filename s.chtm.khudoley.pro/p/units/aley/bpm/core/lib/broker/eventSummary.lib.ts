import type { BrokerEventContractsRow } from '../../tables/brokerEventContracts.table'
import type { BrokerPrimarySummaryItem } from './types.lib'
import { getByDotPath, isSecretLikeKey } from './safeJson.lib'

function formatValue(
  value: unknown,
  maxLength: number
):
  | BrokerPrimarySummaryItem['value']
  | { value: BrokerPrimarySummaryItem['value']; truncated?: boolean }
  | null {
  if (value === null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.length > maxLength) return { value: trimmed.slice(0, maxLength), truncated: true }
    return trimmed
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return { kind: 'array', length: value.length }
  if (typeof value === 'object' && value !== null) {
    return { kind: 'object', keys: Object.keys(value as Record<string, unknown>).length }
  }
  return null
}

function normalizeSummaryField(
  raw: unknown
): { path: string; label: string; maxLength: number } | null {
  if (typeof raw !== 'object' || raw === null) return null
  const item = raw as Record<string, unknown>
  const path = typeof item.path === 'string' ? item.path.trim() : ''
  const label = typeof item.label === 'string' ? item.label.trim() : ''
  if (!path || !label || path.length > 160 || label.length > 80) return null
  if (path.split('.').some((part) => isSecretLikeKey(part))) return null
  const maxLength =
    typeof item.maxLength === 'number' && Number.isFinite(item.maxLength)
      ? Math.max(20, Math.min(500, Math.floor(item.maxLength)))
      : 160
  return { path, label, maxLength }
}

function displayFields(contract: BrokerEventContractsRow | null): Array<{
  path: string
  label: string
  maxLength: number
}> {
  const display = contract?.display
  if (typeof display !== 'object' || display === null) return []
  const raw = (display as Record<string, unknown>).summaryFields
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeSummaryField).filter((item): item is NonNullable<typeof item> => !!item)
}

export function buildPrimarySummary(
  payload: unknown,
  contract: BrokerEventContractsRow | null
): BrokerPrimarySummaryItem[] {
  const items: BrokerPrimarySummaryItem[] = []
  for (const field of displayFields(contract)) {
    const formatted = formatValue(getByDotPath(payload, field.path), field.maxLength)
    if (!formatted) continue
    if (typeof formatted === 'object' && 'value' in formatted) {
      items.push({
        label: field.label,
        path: field.path,
        value: formatted.value,
        truncated: formatted.truncated
      })
    } else {
      items.push({ label: field.label, path: field.path, value: formatted })
    }
  }
  if (items.length) return items
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return []
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (items.length >= 6) break
    if (isSecretLikeKey(key)) continue
    const formatted = formatValue(value, 160)
    if (!formatted) continue
    if (typeof formatted === 'object' && 'value' in formatted) {
      items.push({ label: key, path: key, value: formatted.value, truncated: formatted.truncated })
    } else {
      items.push({ label: key, path: key, value: formatted })
    }
  }
  return items
}
