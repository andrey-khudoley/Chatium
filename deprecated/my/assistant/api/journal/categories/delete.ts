// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as categoriesRepo from '../../../repos/notebook-categories.repo'
import * as journalNotesRepo from '../../../repos/journal-notes.repo'

const LOG_PATH = 'api/journal/categories/delete'

export const deleteNotebookCategoryRoute = app
  .body((s) => ({
    id: s.string()
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос удаления категории`,
      payload: { id: req.body.id }
    })

    try {
      const ok = await categoriesRepo.deleteForUser(ctx, user.id, req.body.id)
      if (!ok) {
        return { success: false, error: 'Категория не найдена' }
      }
      const cleaned = await journalNotesRepo.removeCategoryFromAllNotes(ctx, user.id, req.body.id)
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Категория удалена`,
        payload: { id: req.body.id, notesCleanedUp: cleaned }
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
