// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as journalNotesRepo from '../../../repos/journal-notes.repo'

const LOG_PATH = 'api/journal/notes/create'

const DEFAULT_TITLE = 'Новая заметка'

export const createJournalNoteRoute = app
  .body((s) => ({
    title: s.optional(s.string()),
    content: s.optional(s.string()),
    folderId: s.optional(s.string()),
    categoryIds: s.optional(s.array(s.string())),
    linkedTaskId: s.optional(s.string()),
    linkedProjectId: s.optional(s.string()),
    linkedClientId: s.optional(s.string()),
    noteDate: s.optional(s.string())
  }))
  .post('/', async (ctx, req) => {
    const body = req.body as Record<string, unknown> | undefined
    const bodyKeys = body && typeof body === 'object' ? Object.keys(body) : []

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос создания заметки`,
      payload: { bodyKeys }
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
      const row = await journalNotesRepo.createForUser(ctx, user.id, {
        title,
        content,
        folderId: req.body.folderId ?? null,
        categoryIds: req.body.categoryIds ?? [],
        linkedTaskId: req.body.linkedTaskId ?? null,
        linkedProjectId: req.body.linkedProjectId ?? null,
        linkedClientId: req.body.linkedClientId ?? null,
        noteDate: req.body.noteDate ?? null
      })
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
        message: `[${LOG_PATH}] Ошибка создания заметки`,
        payload: { error: errMsg }
      })
      return { success: false, error: errMsg }
    }
  })
