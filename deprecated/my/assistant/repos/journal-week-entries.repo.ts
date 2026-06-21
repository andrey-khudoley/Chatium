import JournalWeekEntries from '../tables/journal-week-entries.table'
import JournalWeekSummary from '../tables/journal-week-summary.table'
import { getWeekDayKeysFromMonday, getWeekNumberFromMondayKey } from '../lib/journal-week-key'

export type JournalWeekDayId = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type JournalWeekDayEntryDto = {
  dayId: JournalWeekDayId
  dayKey: string
  value: string
  locked: boolean
}

export type JournalWeekEntryDto = {
  mondayKey: string
  weekNumber: number
  summary: { value: string; locked: boolean }
  days: JournalWeekDayEntryDto[]
}

const DAY_IDS: JournalWeekDayId[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function emptyDay(dayId: JournalWeekDayId, dayKey: string): JournalWeekDayEntryDto {
  return { dayId, dayKey, value: '', locked: false }
}

export async function getWeekByUserAndMonday(
  ctx: app.Ctx,
  userId: string,
  mondayKey: string
): Promise<JournalWeekEntryDto> {
  const dayKeys = getWeekDayKeysFromMonday(mondayKey)
  const rows = await JournalWeekEntries.findAll(ctx, {
    where: {
      userId,
      dayKey: { $in: dayKeys }
    }
  })
  const byKey = new Map(rows.map((row) => [row.dayKey, row]))
  const summaryRow = await JournalWeekSummary.findOneBy(ctx, { userId, mondayKey })

  const days = dayKeys.map((dayKey, i) => {
    const dayId = DAY_IDS[i]
    const row = byKey.get(dayKey)
    if (!row) return emptyDay(dayId, dayKey)
    return { dayId, dayKey, value: row.planText, locked: row.locked }
  })

  return {
    mondayKey,
    weekNumber: getWeekNumberFromMondayKey(mondayKey),
    summary: { value: summaryRow?.summaryText ?? '', locked: summaryRow?.locked ?? false },
    days
  }
}

export async function saveDayPlanForUser(
  ctx: app.Ctx,
  userId: string,
  dayKey: string,
  value: string,
  locked: boolean
): Promise<void> {
  const existing = await JournalWeekEntries.findOneBy(ctx, { userId, dayKey })
  if (existing) {
    await JournalWeekEntries.update(ctx, { id: existing.id, planText: value, locked })
    return
  }
  await JournalWeekEntries.create(ctx, { userId, dayKey, planText: value, locked })
}

export async function saveWeekSummaryForUser(
  ctx: app.Ctx,
  userId: string,
  mondayKey: string,
  value: string,
  locked: boolean
): Promise<void> {
  const existing = await JournalWeekSummary.findOneBy(ctx, { userId, mondayKey })
  if (existing) {
    await JournalWeekSummary.update(ctx, { id: existing.id, summaryText: value, locked })
    return
  }
  await JournalWeekSummary.create(ctx, { userId, mondayKey, summaryText: value, locked })
}
