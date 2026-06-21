// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as inboxNotesRepo from '../../../repos/inbox-notes.repo'

const LOG_PATH = 'api/journal/inbox/archive'

export const archiveInboxNoteRoute = app
  .body((s) => ({
    id: s.string(),
    isArchived: s.boolean()
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос архивации инбокса`,
      payload: { id: req.body.id, isArchived: req.body.isArchived }
    })

    try {
      const row = await inboxNotesRepo.updateForUser(ctx, user.id, req.body.id, {
        isArchived: req.body.isArchived
      })
      if (!row) {
        return { success: false, error: 'Заметка не найдена' }
      }
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Заметка ${req.body.isArchived ? 'архивирована' : 'разархивирована'}`,
        payload: { id: req.body.id }
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
