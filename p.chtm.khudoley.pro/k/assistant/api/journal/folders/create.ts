// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as foldersRepo from '../../../repos/notebook-folders.repo'

const LOG_PATH = 'api/journal/folders/create'

export const createNotebookFolderRoute = app
  .body((s) => ({
    name: s.string(),
    color: s.optional(s.string())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос создания папки`,
      payload: {}
    })

    try {
      const folder = await foldersRepo.createForUser(ctx, user.id, {
        name: req.body.name,
        color: req.body.color ?? '#888888'
      })
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Папка создана`,
        payload: { id: folder.id }
      })
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
