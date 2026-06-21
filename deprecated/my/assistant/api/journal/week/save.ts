// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as journalWeekRepo from '../../../repos/journal-week-entries.repo'
import {
  getWeekMondayKeyForDateKey,
  normalizeClientJournalDateKey
} from '../../../lib/journal-week-key'

const LOG_PATH = 'api/journal/week/save'
const MAX_TEXT_LENGTH = 6000

export const saveJournalWeekDayEntryRoute = app
  .body((s) => ({
    dayKey: s.string(),
    value: s.string(),
    locked: s.boolean()
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    const dayKey = normalizeClientJournalDateKey(req.body.dayKey)
    if (!dayKey) return { success: false, error: 'Некорректная дата дня' }

    const value = req.body.value.trim().slice(0, MAX_TEXT_LENGTH)
    const locked = req.body.locked
    const mondayKey = getWeekMondayKeyForDateKey(dayKey)
    if (!mondayKey) return { success: false, error: 'Некорректная неделя' }

    try {
      await journalWeekRepo.saveDayPlanForUser(ctx, user.id, dayKey, value, locked)
      const week = await journalWeekRepo.getWeekByUserAndMonday(ctx, user.id, mondayKey)
      return { success: true, week }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка сохранения недельного плана`,
        payload: { error: String(error), dayKey }
      })
      return { success: false, error: String(error) }
    }
  })
