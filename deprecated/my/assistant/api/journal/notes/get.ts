// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as journalNotesRepo from '../../../repos/journal-notes.repo'

const LOG_PATH = 'api/journal/notes/get'

function parseCategoryIds(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export const getJournalNoteRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос заметки`,
    payload: {}
  })

  const idRaw = req.query.id
  const id = typeof idRaw === 'string' ? idRaw.trim() : ''
  if (!id) {
    return { success: false, error: 'Параметр id обязателен' }
  }

  try {
    const row = await journalNotesRepo.findByIdForUser(ctx, user.id, id)
    if (!row) {
      return { success: false, error: 'Заметка не найдена' }
    }
    return {
      success: true,
      note: {
        id: row.id,
        title: row.title,
        content: row.content,
        folderId: row.folderId ?? null,
        categoryIds: parseCategoryIds(row.categoryIds),
        linkedTaskId: row.linkedTaskId ?? null,
        linkedProjectId: row.linkedProjectId ?? null,
        linkedClientId: row.linkedClientId ?? null,
        noteDate: row.noteDate ?? null,
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
