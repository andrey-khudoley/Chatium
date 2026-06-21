// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as tasksRepo from '../../../repos/tasks.repo'

const LOG_PATH = 'api/tasks/clients/update'

export const updateTaskClientRoute = app
  .body((s) => ({
    id: s.string(),
    name: s.string()
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Обновление клиента`,
      payload: { id: req.body.id }
    })
    try {
      const client = await tasksRepo.updateClient(ctx, user.id, req.body.id, { name: req.body.name })
      if (!client) {
        return { success: false, error: 'Клиент не найден' }
      }
      return { success: true, client }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
