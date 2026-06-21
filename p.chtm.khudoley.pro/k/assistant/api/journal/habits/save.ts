// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { computeHabitsMondayKeyFromNow, normalizeHabitsMondayKey, type JournalHabitRowDto } from '../../../lib/journal-habits-time'
import * as journalHabitsRepo from '../../../repos/journal-habits.repo'
import { getWeekMondayKeyForDateKey } from '../../../lib/journal-week-key'

const LOG_PATH = 'api/journal/habits/save'

function normalizeIncomingRows(raw: unknown): JournalHabitRowDto[] {
  if (!Array.isArray(raw)) return []
  const out: JournalHabitRowDto[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const id = typeof (item as { id?: unknown }).id === 'string' ? (item as { id: string }).id.trim() : ''
    const title = typeof (item as { title?: unknown }).title === 'string' ? (item as { title: string }).title : ''
    const daysRaw = (item as { days?: unknown }).days
    const days: boolean[] = []
    if (Array.isArray(daysRaw)) {
      for (let i = 0; i < 7; i += 1) days.push(Boolean(daysRaw[i]))
    } else {
      for (let i = 0; i < 7; i += 1) days.push(false)
    }
    if (!id) continue
    out.push({ id, title, days })
  }
  return out
}

export const saveJournalHabitsRoute = app
  .body((s) => ({
    mondayKey: s.string(),
    rows: s.array(
      s.object({
        id: s.string(),
        title: s.string(),
        days: s.optional(s.array(s.boolean()))
      })
    )
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    const fallbackMonday = computeHabitsMondayKeyFromNow(Date.now())
    const mondayKeyRaw = normalizeHabitsMondayKey(req.body.mondayKey) ?? fallbackMonday
    const mondayKey = getWeekMondayKeyForDateKey(mondayKeyRaw) ?? fallbackMonday

    const incoming = normalizeIncomingRows(req.body.rows)

    try {
      const habits = await journalHabitsRepo.saveHabitsWeekForUser(ctx, user.id, mondayKey, incoming, Date.now())
      return { success: true, habits }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка сохранения привычек`,
        payload: { error: String(error), mondayKey }
      })
      return { success: false, error: String(error) }
    }
  })
