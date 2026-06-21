// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as inboxNotesRepo from '../../../repos/inbox-notes.repo'

const LOG_PATH = 'api/journal/inbox/create'

const DEFAULT_TITLE = 'Заметка'

export const createInboxNoteRoute = app
  .body((s) => ({
    title: s.optional(s.string()),
    content: s.optional(s.string())
  }))
  .post('/', async (ctx, req) => {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос создания заметки инбокса`,
      payload: {}
    })

    let user: { id: string }
    try {
      user = requireRealUser(ctx)
    } catch (authErr) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] Отказ: не авторизован`,
        payload: { error: String(authErr) }
      })
      throw authErr
    }

    const titleRaw = req.body.title
    const contentRaw = req.body.content
    const title =
      typeof titleRaw === 'string' && titleRaw.trim() !== '' ? titleRaw.trim() : DEFAULT_TITLE
    const content = typeof contentRaw === 'string' ? contentRaw : ''

    try {
      const row = await inboxNotesRepo.createForUser(ctx, user.id, { title, content })
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Заметка создана`,
        payload: { id: row.id, title: row.title }
      })
      return {
        success: true,
        note: { id: row.id, title: row.title }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка создания`,
        payload: { error: errMsg }
      })
      return { success: false, error: errMsg }
    }
  })
