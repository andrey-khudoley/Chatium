// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as tasksRepo from '../../../repos/tasks.repo'

const LOG_PATH = 'api/tasks/projects/create'

export const createTaskProjectRoute = app
  .body((s) => ({
    clientId: s.string(),
    name: s.string(),
    details: s.optional(s.string())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Создание проекта`,
      payload: { clientId: req.body.clientId }
    })
    try {
      const project = await tasksRepo.createProject(
        ctx,
        user.id,
        req.body.clientId,
        req.body.name,
        req.body.details
      )
      if (!project) {
        return { success: false, error: 'Клиент не найден' }
      }
      return { success: true, project }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
