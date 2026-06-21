// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as journalDayRepo from '../../../repos/journal-day-entries.repo'
import { computeJournalDayKeyInTimeZone, normalizeClientJournalDayKey } from '../../../lib/journal-day-key'

const LOG_PATH = 'api/journal/day/get'
const SERVER_FALLBACK_TIME_ZONE = 'Europe/Moscow'

export const getJournalDayEntryRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const clientDayKey = normalizeClientJournalDayKey(req.query.dayKey)
  const dayKey = clientDayKey ?? computeJournalDayKeyInTimeZone(Date.now(), SERVER_FALLBACK_TIME_ZONE)

  try {
    const entry = await journalDayRepo.getByUserAndDay(ctx, user.id, dayKey)
    return { success: true, entry }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка чтения записи дня`,
      payload: { error: String(error), dayKey }
    })
    return { success: false, error: String(error) }
  }
})
