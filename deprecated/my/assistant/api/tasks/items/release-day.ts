// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as tasksRepo from '../../../repos/tasks.repo'

const LOG_PATH = 'api/tasks/items/release-day'

export const releaseTaskDayItemsRoute = app
  .body((s) => ({
    /** зарезервировано на будущее; можно отправить {} */
    _: s.optional(s.string())
  }))
  .post('/', async (ctx, _req) => {
    const user = requireRealUser(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Снятие задач с дня (в очередь)`,
      payload: {}
    })
    try {
      const count = await tasksRepo.releaseAllInProgressToTodo(ctx, user.id)
      return { success: true, count }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
