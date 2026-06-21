// @shared

import { computeJournalDayKeyInTimeZone } from './journal-day-key'
import {
  computeJournalWeekMondayKeyInTimeZone,
  getWeekDayKeysFromMonday,
  normalizeWeekMondayKey
} from './journal-week-key'

/** Серверный fallback для границы 05:00 — как у pomodoro/journal day API (Europe/Moscow). */
const SERVER_FALLBACK_TIMEZONE = 'Europe/Moscow'

export type JournalHabitInteractionMode = 'current' | 'past' | 'future'

export type JournalHabitRowDto = {
  id: string
  title: string
  days: boolean[]
}

export type JournalHabitsWeekDto = {
  mondayKey: string
  weekNumber: number
  dayKeys: string[]
  rows: JournalHabitRowDto[]
  /** Индекс колонки «сегодня» (0=Пн) для текущей недели; null если просмотр не текущей недели */
  todayColumnIndex: number | null
  interactionMode: JournalHabitInteractionMode
  /** Ключ «сегодня» по правилу 05:00 (совпадает с journal day key) */
  effectiveDayKey: string
  /** Понедельник текущей недели по правилу 05:00 — для навигации (нельзя уйти в будущее) */
  currentWeekMondayKey: string
}

const MAX_ROWS = 48
const MAX_TITLE = 200

/** Понедельник недели, к которой относится «эффективный» день (сутки с 05:00 по fallback TZ). */
export function computeHabitsMondayKeyFromNow(nowMs: number): string {
  return computeJournalWeekMondayKeyInTimeZone(nowMs, SERVER_FALLBACK_TIMEZONE)
}

function compareMondayKeys(a: string, b: string): number {
  return a.localeCompare(b)
}

export function getHabitsInteractionMode(viewMondayKey: string, nowMs: number): JournalHabitInteractionMode {
  const cur = computeHabitsMondayKeyFromNow(nowMs)
  const c = compareMondayKeys(viewMondayKey, cur)
  if (c < 0) return 'past'
  if (c > 0) return 'future'
  return 'current'
}

export function getTodayColumnIndexForWeek(mondayKey: string, nowMs: number): number | null {
  if (getHabitsInteractionMode(mondayKey, nowMs) !== 'current') return null
  const dayKeys = getWeekDayKeysFromMonday(mondayKey)
  const effectiveDay = computeJournalDayKeyInTimeZone(nowMs, SERVER_FALLBACK_TIMEZONE)
  const idx = dayKeys.indexOf(effectiveDay)
  return idx >= 0 ? idx : null
}

export function normalizeHabitsMondayKey(raw: unknown): string | undefined {
  return normalizeWeekMondayKey(raw)
}

export function parseRowsJson(raw: string | null | undefined): JournalHabitRowDto[] {
  if (!raw || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: JournalHabitRowDto[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const id = typeof (item as { id?: unknown }).id === 'string' ? (item as { id: string }).id : ''
      const title =
        typeof (item as { title?: unknown }).title === 'string' ? (item as { title: string }).title : ''
      const daysRaw = (item as { days?: unknown }).days
      const days: boolean[] = []
      if (Array.isArray(daysRaw)) {
        for (let i = 0; i < 7; i += 1) {
          days.push(Boolean(daysRaw[i]))
        }
      } else {
        for (let i = 0; i < 7; i += 1) days.push(false)
      }
      if (!id.trim()) continue
      out.push({ id: id.trim(), title: title.trim().slice(0, MAX_TITLE), days })
      if (out.length >= MAX_ROWS) break
    }
    return out
  } catch {
    return []
  }
}

export function serializeRowsJson(rows: JournalHabitRowDto[]): string {
  const safe = rows.slice(0, MAX_ROWS).map((r) => ({
    id: r.id.trim(),
    title: r.title.trim().slice(0, MAX_TITLE),
    days: Array.from({ length: 7 }, (_, i) => Boolean(r.days[i]))
  }))
  return JSON.stringify(safe)
}

export function mergeRowsPreserveLockedDays(
  prev: JournalHabitRowDto[] | null,
  incoming: JournalHabitRowDto[],
  todayIdx: number | null
): JournalHabitRowDto[] {
  const prevMap = new Map((prev ?? []).map((r) => [r.id, r]))
  const incomingSafe = incoming.slice(0, MAX_ROWS).map((r) => ({
    id: r.id.trim(),
    title: r.title.trim().slice(0, MAX_TITLE),
    days: Array.from({ length: 7 }, (_, i) => Boolean(r.days[i]))
  }))

  return incomingSafe.map((row) => {
    const old = prevMap.get(row.id)
    if (todayIdx === null) {
      if (old) return { ...row, days: [...old.days] }
      return row
    }
    const merged = [...row.days]
    for (let i = 0; i < 7; i += 1) {
      if (i !== todayIdx) {
        if (old && old.days.length === 7) merged[i] = old.days[i]
        else merged[i] = false
      }
    }
    return { ...row, days: merged }
  })
}
