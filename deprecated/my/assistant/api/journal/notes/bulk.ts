// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as journalNotesRepo from '../../../repos/journal-notes.repo'

const LOG_PATH = 'api/journal/notes/bulk'

type BulkAction = 'archive' | 'unarchive' | 'delete' | 'move' | 'setCategory'

export const bulkJournalNotesRoute = app
  .body((s) => ({
    ids: s.array(s.string()),
    action: s.string(),
    folderId: s.optional(s.string()),
    categoryIds: s.optional(s.array(s.string()))
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    const action = req.body.action as BulkAction

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Массовое действие`,
      payload: { action, count: req.body.ids.length }
    })

    try {
      let count = 0
      switch (action) {
        case 'archive':
          count = await journalNotesRepo.bulkArchiveForUser(ctx, user.id, req.body.ids, true)
          break
        case 'unarchive':
          count = await journalNotesRepo.bulkArchiveForUser(ctx, user.id, req.body.ids, false)
          break
        case 'delete':
          count = await journalNotesRepo.bulkDeleteForUser(ctx, user.id, req.body.ids)
          break
        case 'move':
          count = await journalNotesRepo.bulkMoveToFolderForUser(
            ctx,
            user.id,
            req.body.ids,
            req.body.folderId ?? null
          )
          break
        case 'setCategory':
          count = await journalNotesRepo.bulkSetCategoryForUser(
            ctx,
            user.id,
            req.body.ids,
            req.body.categoryIds ?? []
          )
          break
        default:
          return { success: false, error: `Неизвестное действие: ${action}` }
      }
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Выполнено`,
        payload: { action, count }
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
