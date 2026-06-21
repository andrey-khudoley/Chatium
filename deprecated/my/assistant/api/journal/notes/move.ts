// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as journalNotesRepo from '../../../repos/journal-notes.repo'

const LOG_PATH = 'api/journal/notes/move'

export const moveJournalNotesRoute = app
  .body((s) => ({
    ids: s.array(s.string()),
    folderId: s.optional(s.string())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос перемещения заметок`,
      payload: { count: req.body.ids.length, folderId: req.body.folderId }
    })

    try {
      const count = await journalNotesRepo.bulkMoveToFolderForUser(
        ctx,
        user.id,
        req.body.ids,
        req.body.folderId ?? null
      )
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Заметки перемещены`,
        payload: { count }
      })
      return { success: true, count }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
