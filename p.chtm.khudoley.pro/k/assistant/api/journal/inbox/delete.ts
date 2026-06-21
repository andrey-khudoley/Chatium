// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as inboxNotesRepo from '../../../repos/inbox-notes.repo'

const LOG_PATH = 'api/journal/inbox/delete'

export const deleteInboxNoteRoute = app
  .body((s) => ({
    id: s.string()
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос удаления заметки инбокса`,
      payload: {}
    })

    try {
      const ok = await inboxNotesRepo.deleteByIdForUser(ctx, user.id, req.body.id)
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
