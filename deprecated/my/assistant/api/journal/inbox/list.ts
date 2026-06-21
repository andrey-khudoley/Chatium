// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as inboxNotesRepo from '../../../repos/inbox-notes.repo'

const LOG_PATH = 'api/journal/inbox/list'

export const listInboxNotesRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const includeArchived = req.query.includeArchived === 'true'

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос списка инбокса`,
    payload: { includeArchived }
  })

  try {
    const notes = await inboxNotesRepo.findSummariesByUserId(ctx, user.id, { includeArchived })
    return { success: true, notes }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error), notes: [] }
  }
})
