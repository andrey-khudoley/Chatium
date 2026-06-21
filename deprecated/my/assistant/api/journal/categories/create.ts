// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as categoriesRepo from '../../../repos/notebook-categories.repo'

const LOG_PATH = 'api/journal/categories/create'

export const createNotebookCategoryRoute = app
  .body((s) => ({
    name: s.string(),
    color: s.optional(s.string())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос создания категории`,
      payload: {}
    })

    try {
      const cat = await categoriesRepo.createForUser(ctx, user.id, {
        name: req.body.name,
        color: req.body.color ?? '#888888'
      })
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Категория создана`,
        payload: { id: cat.id }
      })
      return { success: true, category: cat }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
