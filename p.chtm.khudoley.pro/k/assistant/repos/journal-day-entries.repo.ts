import JournalDayEntries, { type JournalDayEntriesRow } from '../tables/journal-day-entries.table'

export type JournalDaySegmentId = 'night' | 'morning' | 'day' | 'evening'
export type JournalDaySegmentState = { value: string; locked: boolean }
export type JournalDayEntryDto = {
  dayKey: string
  night: JournalDaySegmentState
  morning: JournalDaySegmentState
  day: JournalDaySegmentState
  evening: JournalDaySegmentState
}

function emptyEntry(dayKey: string): JournalDayEntryDto {
  return {
    dayKey,
    night: { value: '', locked: false },
    morning: { value: '', locked: false },
    day: { value: '', locked: false },
    evening: { value: '', locked: false }
  }
}

function toDto(row: JournalDayEntriesRow): JournalDayEntryDto {
  return {
    dayKey: row.dayKey,
    night: { value: row.nightText, locked: row.nightLocked },
    morning: { value: row.morningText, locked: row.morningLocked },
    day: { value: row.dayText, locked: row.dayLocked },
    evening: { value: row.eveningText, locked: row.eveningLocked }
  }
}

export async function getByUserAndDay(ctx: app.Ctx, userId: string, dayKey: string): Promise<JournalDayEntryDto> {
  const row = await JournalDayEntries.findOneBy(ctx, { userId, dayKey })
  if (!row) return emptyEntry(dayKey)
  return toDto(row)
}

export async function saveSegmentForUserDay(
  ctx: app.Ctx,
  userId: string,
  dayKey: string,
  segment: JournalDaySegmentId,
  value: string,
  locked: boolean
): Promise<JournalDayEntryDto> {
  const existing = await JournalDayEntries.findOneBy(ctx, { userId, dayKey })
  const base = existing
    ? existing
    : await JournalDayEntries.create(ctx, {
        userId,
        dayKey,
        nightText: '',
        nightLocked: false,
        morningText: '',
        morningLocked: false,
        dayText: '',
        dayLocked: false,
        eveningText: '',
        eveningLocked: false
      })

  const patchBySegment: Record<JournalDaySegmentId, Partial<JournalDayEntriesRow>> = {
    night: { nightText: value, nightLocked: locked },
    morning: { morningText: value, morningLocked: locked },
    day: { dayText: value, dayLocked: locked },
    evening: { eveningText: value, eveningLocked: locked }
  }

  const updated = await JournalDayEntries.update(ctx, { id: base.id, ...patchBySegment[segment] })
  return toDto(updated)
}
