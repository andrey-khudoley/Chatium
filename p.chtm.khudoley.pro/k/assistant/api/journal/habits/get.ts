// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { computeHabitsMondayKeyFromNow, normalizeHabitsMondayKey } from '../../../lib/journal-habits-time'
import * as journalHabitsRepo from '../../../repos/journal-habits.repo'
import { getWeekMondayKeyForDateKey } from '../../../lib/journal-week-key'

const LOG_PATH = 'api/journal/habits/get'

export const getJournalHabitsRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const fallbackMonday = computeHabitsMondayKeyFromNow(Date.now())
  const mondayKeyRaw = normalizeHabitsMondayKey(req.query.mondayKey) ?? fallbackMonday
  const mondayKey = getWeekMondayKeyForDateKey(mondayKeyRaw) ?? fallbackMonday

  try {
    const habits = await journalHabitsRepo.getHabitsWeekForUser(ctx, user.id, mondayKey, Date.now())
    return { success: true, habits }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка чтения привычек`,
      payload: { error: String(error), mondayKey }
    })
    return { success: false, error: String(error) }
  }
})
