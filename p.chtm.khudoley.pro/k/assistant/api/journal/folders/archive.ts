// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as foldersRepo from '../../../repos/notebook-folders.repo'
import * as journalNotesRepo from '../../../repos/journal-notes.repo'

const LOG_PATH = 'api/journal/folders/archive'

export const archiveNotebookFolderRoute = app
  .body((s) => ({
    id: s.string(),
    isArchived: s.boolean()
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос архивации папки`,
      payload: { id: req.body.id, isArchived: req.body.isArchived }
    })

    try {
      const folder = await foldersRepo.archiveForUser(ctx, user.id, req.body.id, req.body.isArchived)
      if (!folder) {
        return { success: false, error: 'Папка не найдена' }
      }
      const notesAffected = await journalNotesRepo.archiveByFolderForUser(
        ctx,
        user.id,
        req.body.id,
        req.body.isArchived
      )
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Папка ${req.body.isArchived ? 'архивирована' : 'разархивирована'}`,
        payload: { id: folder.id, notesAffected }
      })
      return { success: true, folder }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
