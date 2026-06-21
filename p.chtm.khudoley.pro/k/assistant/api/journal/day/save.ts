// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as journalDayRepo from '../../../repos/journal-day-entries.repo'
import {
  computeJournalDayKeyInTimeZone,
  normalizeClientJournalDayKey
} from '../../../lib/journal-day-key'

const LOG_PATH = 'api/journal/day/save'
const SERVER_FALLBACK_TIME_ZONE = 'Europe/Moscow'
const MAX_TEXT_LENGTH = 6000

function normalizeSegment(raw: unknown): journalDayRepo.JournalDaySegmentId | null {
  if (raw === 'night' || raw === 'morning' || raw === 'day' || raw === 'evening') return raw
  return null
}

export const saveJournalDayEntryRoute = app
  .body((s) => ({
    dayKey: s.optional(s.string()),
    segment: s.string(),
    value: s.string(),
    locked: s.boolean()
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    const segment = normalizeSegment(req.body.segment)
    if (!segment) {
      return { success: false, error: 'Некорректный сегмент' }
    }

    const dayKey =
      normalizeClientJournalDayKey(req.body.dayKey) ??
      computeJournalDayKeyInTimeZone(Date.now(), SERVER_FALLBACK_TIME_ZONE)
    const value = req.body.value.trim().slice(0, MAX_TEXT_LENGTH)
    const locked = req.body.locked

    try {
      const entry = await journalDayRepo.saveSegmentForUserDay(ctx, user.id, dayKey, segment, value, locked)
      return { success: true, entry }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка сохранения записи дня`,
        payload: { error: String(error), dayKey, segment }
      })
      return { success: false, error: String(error) }
    }
  })
