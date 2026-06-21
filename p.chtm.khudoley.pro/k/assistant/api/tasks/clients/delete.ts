// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as tasksRepo from '../../../repos/tasks.repo'

const LOG_PATH = 'api/tasks/clients/delete'

export const deleteTaskClientRoute = app
  .body((s) => ({
    id: s.string()
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Удаление клиента`,
      payload: { id: req.body.id }
    })
    try {
      const ok = await tasksRepo.deleteClient(ctx, user.id, req.body.id)
      if (!ok) {
        return { success: false, error: 'Клиент не найден' }
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
