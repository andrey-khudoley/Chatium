// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as journalWeekRepo from '../../../repos/journal-week-entries.repo'
import { normalizeWeekMondayKey } from '../../../lib/journal-week-key'

const LOG_PATH = 'api/journal/week/save-summary'
const MAX_TEXT_LENGTH = 8000

export const saveJournalWeekSummaryRoute = app
  .body((s) => ({
    mondayKey: s.string(),
    value: s.string(),
    locked: s.boolean()
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    const mondayKey = normalizeWeekMondayKey(req.body.mondayKey)
    if (!mondayKey) return { success: false, error: 'Некорректный ключ недели' }

    const value = req.body.value.trim().slice(0, MAX_TEXT_LENGTH)
    const locked = req.body.locked

    try {
      await journalWeekRepo.saveWeekSummaryForUser(ctx, user.id, mondayKey, value, locked)
      const week = await journalWeekRepo.getWeekByUserAndMonday(ctx, user.id, mondayKey)
      return { success: true, week }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка сохранения недельного summary`,
        payload: { error: String(error), mondayKey }
      })
      return { success: false, error: String(error) }
    }
  })
