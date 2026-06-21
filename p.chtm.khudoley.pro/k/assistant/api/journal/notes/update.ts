// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as journalNotesRepo from '../../../repos/journal-notes.repo'

const LOG_PATH = 'api/journal/notes/update'

export const updateJournalNoteRoute = app
  .body((s) => ({
    id: s.string(),
    title: s.optional(s.string()),
    content: s.optional(s.string()),
    folderId: s.optional(s.string()),
    categoryIds: s.optional(s.array(s.string())),
    linkedTaskId: s.optional(s.string()),
    linkedProjectId: s.optional(s.string()),
    linkedClientId: s.optional(s.string()),
    noteDate: s.optional(s.string()),
    isArchived: s.optional(s.boolean())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос обновления заметки`,
      payload: { id: req.body.id }
    })

    const data: journalNotesRepo.UpdateNoteData = {}
    if (req.body.title !== undefined) {
      data.title = req.body.title.trim() !== '' ? req.body.title.trim() : 'Без названия'
    }
    if (req.body.content !== undefined) data.content = req.body.content
    if (req.body.folderId !== undefined) data.folderId = req.body.folderId || null
    if (req.body.categoryIds !== undefined) data.categoryIds = req.body.categoryIds
    if (req.body.linkedTaskId !== undefined) data.linkedTaskId = req.body.linkedTaskId || null
    if (req.body.linkedProjectId !== undefined) data.linkedProjectId = req.body.linkedProjectId || null
    if (req.body.linkedClientId !== undefined) data.linkedClientId = req.body.linkedClientId || null
    if (req.body.noteDate !== undefined) data.noteDate = req.body.noteDate || null
    if (req.body.isArchived !== undefined) data.isArchived = req.body.isArchived

    try {
      const row = await journalNotesRepo.updateForUser(ctx, user.id, req.body.id, data)
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
