// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as inboxNotesRepo from '../../../repos/inbox-notes.repo'

const LOG_PATH = 'api/journal/inbox/update'

export const updateInboxNoteRoute = app
  .body((s) => ({
    id: s.string(),
    title: s.optional(s.string()),
    content: s.optional(s.string()),
    isArchived: s.optional(s.boolean())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос обновления заметки инбокса`,
      payload: { id: req.body.id }
    })

    const data: inboxNotesRepo.UpdateInboxNoteData = {}
    if (req.body.title !== undefined) {
      data.title = req.body.title.trim() !== '' ? req.body.title.trim() : 'Без названия'
    }
    if (req.body.content !== undefined) data.content = req.body.content
    if (req.body.isArchived !== undefined) data.isArchived = req.body.isArchived

    try {
      const row = await inboxNotesRepo.updateForUser(ctx, user.id, req.body.id, data)
      if (!row) {
        return { success: false, error: 'Заметка не найдена' }
      }
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Заметка обновлена`,
        payload: { id: row.id }
      })
      return {
        success: true,
        note: { id: row.id, title: row.title }
      }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка обновления`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
