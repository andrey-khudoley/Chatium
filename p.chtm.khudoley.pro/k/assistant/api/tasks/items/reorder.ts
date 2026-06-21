// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as tasksRepo from '../../../repos/tasks.repo'

const LOG_PATH = 'api/tasks/items/reorder'

export const reorderTaskItemsRoute = app
  .body((s) => ({
    projectId: s.string(),
    orderedIds: s.array(s.string())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Перестановка задач`,
      payload: { projectId: req.body.projectId, n: req.body.orderedIds.length }
    })
    try {
      const ok = await tasksRepo.reorderTasks(ctx, user.id, req.body.projectId, req.body.orderedIds)
      if (!ok) {
        return { success: false, error: 'Некорректный порядок или проект не найден' }
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
