// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as journalNotesRepo from '../../../repos/journal-notes.repo'

const LOG_PATH = 'api/journal/notes/reorder'

export const reorderJournalNotesRoute = app
  .body((s) => ({
    orderedIds: s.array(s.string()),
    folderId: s.optional(s.string())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос пересортировки заметок`,
      payload: { count: req.body.orderedIds.length, folderId: req.body.folderId }
    })

    try {
      const ok = await journalNotesRepo.reorderForUser(
        ctx,
        user.id,
        req.body.orderedIds,
        req.body.folderId ?? null
      )
      if (!ok) {
        return { success: false, error: 'Невалидный набор ID' }
      }
      return { success: true }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
