/**
 * Приводит произвольный объект из JSON к Record<string, string> (для UTM и т.п.).
 * В схеме тела поле задаётся как `s.optional(s.unknown())`, не `s.record(…)` — в UGC `s.record` падает (restrictModifiers / `modifier`).
 */
export function normalizeStringRecord(v: unknown): Record<string, string> | undefined {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return undefined
  const o = v as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(o)) {
    if (val === undefined || val === null) continue
    out[k] = typeof val === 'string' ? val : String(val)
  }
  return Object.keys(out).length > 0 ? out : undefined
}
