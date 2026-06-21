// @shared

import { computeJournalDayKeyInTimeZone } from './journal-day-key'

const JOURNAL_DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

type Ymd = { y: number; m: number; d: number }

function parseYmd(raw: string): Ymd | null {
  if (!JOURNAL_DATE_KEY_RE.test(raw)) return null
  const y = Number(raw.slice(0, 4))
  const m = Number(raw.slice(5, 7))
  const d = Number(raw.slice(8, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return { y, m, d }
}

function formatYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function addDaysYmd(base: Ymd, deltaDays: number): Ymd {
  const dt = new Date(Date.UTC(base.y, base.m - 1, base.d + deltaDays))
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }
}

function getMondayForLocalDate(nowMs: number): Ymd {
  const dt = new Date(nowMs)
  const y = dt.getFullYear()
  const m = dt.getMonth() + 1
  const d = dt.getDate()
  const dow = dt.getDay() // 0=Sun ... 6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  return addDaysYmd({ y, m, d }, diffToMonday)
}

export function normalizeClientJournalDateKey(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const v = raw.trim()
  if (v.length > 32 || !JOURNAL_DATE_KEY_RE.test(v)) return undefined
  return v
}

export function computeJournalWeekMondayKeyLocal(nowMs: number): string {
  const monday = getMondayForLocalDate(nowMs)
  return formatYmd(monday.y, monday.m, monday.d)
}

/**
 * Понедельник недели для «эффективного» дня с границей 05:00 в заданной IANA-зоне
 * (на сервере вместо Local — иначе при TZ=UTC получится сдвиг относительно GMT+3).
 */
export function computeJournalWeekMondayKeyInTimeZone(nowMs: number, timeZone: string): string {
  const dayKey = computeJournalDayKeyInTimeZone(nowMs, timeZone)
  return getWeekMondayKeyForDateKey(dayKey) ?? computeJournalWeekMondayKeyLocal(nowMs)
}

export function normalizeWeekMondayKey(raw: unknown): string | undefined {
  const key = normalizeClientJournalDateKey(raw)
  if (!key) return undefined
  const parsed = parseYmd(key)
  if (!parsed) return undefined
  return formatYmd(parsed.y, parsed.m, parsed.d)
}

export function shiftWeekMondayKey(mondayKey: string, weeksDelta: number): string {
  const parsed = parseYmd(mondayKey)
  if (!parsed) return mondayKey
  const shifted = addDaysYmd(parsed, weeksDelta * 7)
  return formatYmd(shifted.y, shifted.m, shifted.d)
}

export function getWeekDayKeysFromMonday(mondayKey: string): string[] {
  const parsed = parseYmd(mondayKey)
  if (!parsed) return []
  const keys: string[] = []
  for (let i = 0; i < 7; i += 1) {
    const next = addDaysYmd(parsed, i)
    keys.push(formatYmd(next.y, next.m, next.d))
  }
  return keys
}

export function getWeekMondayKeyForDateKey(dayKey: string): string | undefined {
  const parsed = parseYmd(dayKey)
  if (!parsed) return undefined
  const dt = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
  const dow = dt.getUTCDay() // 0=Sun ... 6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  const monday = addDaysYmd(parsed, diffToMonday)
  return formatYmd(monday.y, monday.m, monday.d)
}

export function getWeekNumberFromMondayKey(mondayKey: string): number {
  const parsed = parseYmd(mondayKey)
  if (!parsed) return 0
  const dt = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
  const jan4 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4))
  const jan4Dow = jan4.getUTCDay() || 7
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1))
  const diffMs = dt.getTime() - week1Monday.getTime()
  return Math.floor(diffMs / 86400000 / 7) + 1
}
