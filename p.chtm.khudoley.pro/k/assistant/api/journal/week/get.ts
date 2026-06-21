// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as journalWeekRepo from '../../../repos/journal-week-entries.repo'
import {
  computeJournalWeekMondayKeyInTimeZone,
  getWeekMondayKeyForDateKey,
  normalizeWeekMondayKey
} from '../../../lib/journal-week-key'

const LOG_PATH = 'api/journal/week/get'
const SERVER_FALLBACK_TIME_ZONE = 'Europe/Moscow'

export const getJournalWeekEntryRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const mondayKeyRaw =
    normalizeWeekMondayKey(req.query.mondayKey) ?? computeJournalWeekMondayKeyInTimeZone(Date.now(), SERVER_FALLBACK_TIME_ZONE)
  const mondayKey =
    getWeekMondayKeyForDateKey(mondayKeyRaw) ??
    computeJournalWeekMondayKeyInTimeZone(Date.now(), SERVER_FALLBACK_TIME_ZONE)

  try {
    const week = await journalWeekRepo.getWeekByUserAndMonday(ctx, user.id, mondayKey)
    return { success: true, week }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка чтения недельного плана`,
      payload: { error: String(error), mondayKey }
    })
    return { success: false, error: String(error) }
  }
})
