// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as foldersRepo from '../../../repos/notebook-folders.repo'
import * as journalNotesRepo from '../../../repos/journal-notes.repo'

const LOG_PATH = 'api/journal/folders/delete'

export const deleteNotebookFolderRoute = app
  .body((s) => ({
    id: s.string()
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос удаления папки`,
      payload: { id: req.body.id }
    })

    try {
      const moved = await journalNotesRepo.clearFolderIdForUser(ctx, user.id, req.body.id)
      const ok = await foldersRepo.deleteForUser(ctx, user.id, req.body.id)
      if (!ok) {
        return { success: false, error: 'Папка не найдена' }
      }
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Папка удалена`,
        payload: { id: req.body.id, notesMovedToRoot: moved }
      })
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
