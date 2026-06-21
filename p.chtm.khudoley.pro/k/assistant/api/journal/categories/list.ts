// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as categoriesRepo from '../../../repos/notebook-categories.repo'

const LOG_PATH = 'api/journal/categories/list'

export const listNotebookCategoriesRoute = app.get('/', async (ctx, _req) => {
  const user = requireRealUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос списка категорий`,
    payload: {}
  })

  try {
    const categories = await categoriesRepo.findByUserId(ctx, user.id)
    return { success: true, categories }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error), categories: [] }
  }
})
