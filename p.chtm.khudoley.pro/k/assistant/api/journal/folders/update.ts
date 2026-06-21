// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as foldersRepo from '../../../repos/notebook-folders.repo'

const LOG_PATH = 'api/journal/folders/update'

export const updateNotebookFolderRoute = app
  .body((s) => ({
    id: s.string(),
    name: s.optional(s.string()),
    color: s.optional(s.string())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос обновления папки`,
      payload: { id: req.body.id }
    })

    try {
      const folder = await foldersRepo.updateForUser(ctx, user.id, req.body.id, {
        name: req.body.name,
        color: req.body.color
      })
      if (!folder) {
        return { success: false, error: 'Папка не найдена' }
      }
      return { success: true, folder }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
