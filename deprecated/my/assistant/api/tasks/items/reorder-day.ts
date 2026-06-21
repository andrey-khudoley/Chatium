// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as tasksRepo from '../../../repos/tasks.repo'

const LOG_PATH = 'api/tasks/items/reorder-day'

export const reorderTaskDayItemsRoute = app
  .body((s) => ({
    orderedIds: s.array(s.string())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Перестановка дневного списка`,
      payload: { n: req.body.orderedIds.length }
    })
    try {
      const ok = await tasksRepo.reorderDayTasks(ctx, user.id, req.body.orderedIds)
      if (!ok) {
        return { success: false, error: 'Некорректный порядок задач' }
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
