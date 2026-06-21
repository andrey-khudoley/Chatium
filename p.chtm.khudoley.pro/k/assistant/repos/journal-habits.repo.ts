import JournalHabitsWeek from '../tables/journal-habits-week.table'
import { computeJournalDayKeyInTimeZone } from '../lib/journal-day-key'

const HABITS_DAY_FALLBACK_TIMEZONE = 'Europe/Moscow'
import {
  computeHabitsMondayKeyFromNow,
  getHabitsInteractionMode,
  getTodayColumnIndexForWeek,
  mergeRowsPreserveLockedDays,
  parseRowsJson,
  serializeRowsJson,
  type JournalHabitRowDto,
  type JournalHabitsWeekDto
} from '../lib/journal-habits-time'
import { getWeekDayKeysFromMonday, getWeekNumberFromMondayKey, shiftWeekMondayKey } from '../lib/journal-week-key'

async function findWeekRow(ctx: app.Ctx, userId: string, mondayKey: string) {
  return JournalHabitsWeek.findOneBy(ctx, { userId, mondayKey })
}

async function findPreviousWeekRow(ctx: app.Ctx, userId: string, mondayKey: string) {
  const prevKey = shiftWeekMondayKey(mondayKey, -1)
  return findWeekRow(ctx, userId, prevKey)
}

function cloneTitlesEmptyDays(prevRows: JournalHabitRowDto[]): JournalHabitRowDto[] {
  return prevRows.map((r) => ({
    id: r.id,
    title: r.title,
    days: [false, false, false, false, false, false, false]
  }))
}

export async function getHabitsWeekForUser(
  ctx: app.Ctx,
  userId: string,
  mondayKey: string,
  nowMs: number
): Promise<JournalHabitsWeekDto> {
  const dayKeys = getWeekDayKeysFromMonday(mondayKey)
  const weekNumber = getWeekNumberFromMondayKey(mondayKey)
  const interactionMode = getHabitsInteractionMode(mondayKey, nowMs)
  const effectiveDayKey = computeJournalDayKeyInTimeZone(nowMs, HABITS_DAY_FALLBACK_TIMEZONE)
  const currentWeekMondayKey = computeHabitsMondayKeyFromNow(nowMs)

  if (interactionMode === 'future') {
    const stale = await findWeekRow(ctx, userId, mondayKey)
    if (stale) await JournalHabitsWeek.delete(ctx, stale.id)
    return {
      mondayKey,
      weekNumber,
      dayKeys,
      rows: [],
      todayColumnIndex: null,
      interactionMode,
      effectiveDayKey,
      currentWeekMondayKey
    }
  }

  const todayColumnIndex = getTodayColumnIndexForWeek(mondayKey, nowMs)

  let row = await findWeekRow(ctx, userId, mondayKey)
  if (!row) {
    const prev = await findPreviousWeekRow(ctx, userId, mondayKey)
    const prevRows = prev ? parseRowsJson(prev.rowsJson) : []
    const initialRows = prevRows.length > 0 ? cloneTitlesEmptyDays(prevRows) : []
    if (initialRows.length > 0) {
      await JournalHabitsWeek.create(ctx, {
        userId,
        mondayKey,
        rowsJson: serializeRowsJson(initialRows)
      })
      row = await findWeekRow(ctx, userId, mondayKey)
    }
  }

  let rows = row ? parseRowsJson(row.rowsJson) : []

  // Запись недели есть, но список пуст — переносим названия с прошлой недели (как при отсутствии строки).
  if (rows.length === 0 && row) {
    const prev = await findPreviousWeekRow(ctx, userId, mondayKey)
    const prevRows = prev ? parseRowsJson(prev.rowsJson) : []
    if (prevRows.length > 0) {
      const seeded = cloneTitlesEmptyDays(prevRows)
      await JournalHabitsWeek.update(ctx, { id: row.id, rowsJson: serializeRowsJson(seeded) })
      rows = seeded
    }
  }

  return {
    mondayKey,
    weekNumber,
    dayKeys,
    rows,
    todayColumnIndex,
    interactionMode,
    effectiveDayKey,
    currentWeekMondayKey
  }
}

export async function saveHabitsWeekForUser(
  ctx: app.Ctx,
  userId: string,
  mondayKey: string,
  incomingRows: JournalHabitRowDto[],
  nowMs: number
): Promise<JournalHabitsWeekDto> {
  const mode = getHabitsInteractionMode(mondayKey, nowMs)
  if (mode !== 'current') {
    return getHabitsWeekForUser(ctx, userId, mondayKey, nowMs)
  }

  const todayIdx = getTodayColumnIndexForWeek(mondayKey, nowMs)
  const existing = await findWeekRow(ctx, userId, mondayKey)
  const prevParsed = existing ? parseRowsJson(existing.rowsJson) : null
  const merged = mergeRowsPreserveLockedDays(prevParsed, incomingRows, todayIdx)
  const payload = serializeRowsJson(merged)

  if (existing) {
    await JournalHabitsWeek.update(ctx, { id: existing.id, rowsJson: payload })
  } else {
    await JournalHabitsWeek.create(ctx, { userId, mondayKey, rowsJson: payload })
  }

  return getHabitsWeekForUser(ctx, userId, mondayKey, nowMs)
}
