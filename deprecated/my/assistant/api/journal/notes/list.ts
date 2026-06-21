// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as journalNotesRepo from '../../../repos/journal-notes.repo'
import * as foldersRepo from '../../../repos/notebook-folders.repo'
import * as categoriesRepo from '../../../repos/notebook-categories.repo'

const LOG_PATH = 'api/journal/notes/list'

export const listJournalNotesRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const includeArchived = req.query.includeArchived === 'true'

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос списка заметок`,
    payload: { includeArchived }
  })

  try {
    const [notes, folders, categories] = await Promise.all([
      journalNotesRepo.findSummariesByUserId(ctx, user.id, { includeArchived }),
      foldersRepo.findByUserId(ctx, user.id, includeArchived),
      categoriesRepo.findByUserId(ctx, user.id)
    ])
    return { success: true, notes, folders, categories }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error), notes: [], folders: [], categories: [] }
  }
})
