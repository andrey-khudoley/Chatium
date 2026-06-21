// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as foldersRepo from '../../../repos/notebook-folders.repo'

const LOG_PATH = 'api/journal/folders/reorder'

export const reorderNotebookFoldersRoute = app
  .body((s) => ({
    orderedIds: s.array(s.string())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос пересортировки папок`,
      payload: { count: req.body.orderedIds.length }
    })

    try {
      const ok = await foldersRepo.reorderForUser(ctx, user.id, req.body.orderedIds)
      if (!ok) {
        return { success: false, error: 'Невалидный набор ID' }
      }
      return { success: true }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
