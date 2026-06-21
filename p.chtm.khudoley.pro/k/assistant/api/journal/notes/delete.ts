// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as journalNotesRepo from '../../../repos/journal-notes.repo'

const LOG_PATH = 'api/journal/notes/delete'

/**
 * POST /api/journal/notes/delete — удалить свою заметку по id.
 */
export const deleteJournalNoteRoute = app
  .body((s) => ({
    id: s.string()
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос удаления заметки`,
      payload: {}
    })

    try {
      const ok = await journalNotesRepo.deleteByIdForUser(ctx, user.id, req.body.id)
      if (!ok) {
        await loggerLib.writeServerLog(ctx, {
          severity: 5,
          message: `[${LOG_PATH}] Заметка не найдена`,
          payload: { id: req.body.id }
        })
        return { success: false, error: 'Заметка не найдена' }
      }
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Заметка удалена`,
        payload: { id: req.body.id }
      })
      return { success: true }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка удаления`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
