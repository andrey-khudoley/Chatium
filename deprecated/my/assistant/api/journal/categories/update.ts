// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as categoriesRepo from '../../../repos/notebook-categories.repo'

const LOG_PATH = 'api/journal/categories/update'

export const updateNotebookCategoryRoute = app
  .body((s) => ({
    id: s.string(),
    name: s.optional(s.string()),
    color: s.optional(s.string())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Запрос обновления категории`,
      payload: { id: req.body.id }
    })

    try {
      const cat = await categoriesRepo.updateForUser(ctx, user.id, req.body.id, {
        name: req.body.name,
        color: req.body.color
      })
      if (!cat) {
        return { success: false, error: 'Категория не найдена' }
      }
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
