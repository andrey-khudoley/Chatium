// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as inboxNotesRepo from '../../../repos/inbox-notes.repo'

const LOG_PATH = 'api/journal/inbox/get'

export const getInboxNoteRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос заметки инбокса`,
    payload: {}
  })

  const idRaw = req.query.id
  const id = typeof idRaw === 'string' ? idRaw.trim() : ''
  if (!id) {
    return { success: false, error: 'Параметр id обязателен' }
  }

  try {
    const row = await inboxNotesRepo.findByIdForUser(ctx, user.id, id)
    if (!row) {
      return { success: false, error: 'Заметка не найдена' }
    }
    return {
      success: true,
      note: {
        id: row.id,
        title: row.title,
        content: row.content,
        isArchived: row.isArchived ?? false,
        sortOrder: row.sortOrder ?? 0
      }
    }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
