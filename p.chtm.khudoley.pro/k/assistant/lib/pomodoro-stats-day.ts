// @shared

const STATS_DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

function formatYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Календарная дата по локальному времени браузера (полуночная граница «суток»).
 * Для авторизованных пользователей предпочтительно {@link computePomodoroStatsDayKeyForUtcOffsetHours}
 * (часовой пояс из профиля).
 */
export function computePomodoroStatsDayKeyLocal(nowMs: number): string {
  const d = new Date(nowMs)
  return formatYmd(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

/**
 * Ключ дневной статистики: календарные сутки по смещению UTC из настроек пользователя (UTC+N часов),
 * граница в **полночь** в этой зоне.
 */
export function computePomodoroStatsDayKeyForUtcOffsetHours(nowMs: number, utcOffsetHours: number): string {
  const h = Number.isFinite(utcOffsetHours) ? utcOffsetHours : 0
  const shifted = new Date(nowMs + h * 3600 * 1000)
  return formatYmd(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate())
}

/**
 * Календарная дата в заданной IANA-зоне (полночная граница суток).
 */
export function computePomodoroStatsDayKeyInTimeZone(nowMs: number, timeZone: string): string {
  const partsArr = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(nowMs))

  const parts: Record<string, string> = {}
  for (const p of partsArr) {
    if (p.type !== 'literal') parts[p.type] = p.value
  }

  const y = parseInt(parts.year, 10)
  const mo = parseInt(parts.month, 10)
  const d = parseInt(parts.day, 10)
  return formatYmd(y, mo, d)
}

export function normalizeClientStatsDayKey(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  if (t.length > 32 || !STATS_DAY_KEY_RE.test(t)) return undefined
  return t
}
