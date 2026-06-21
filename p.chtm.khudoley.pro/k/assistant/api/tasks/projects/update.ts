// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as tasksRepo from '../../../repos/tasks.repo'

const LOG_PATH = 'api/tasks/projects/update'

export const updateTaskProjectRoute = app
  .body((s) => ({
    id: s.string(),
    name: s.string(),
    clientId: s.optional(s.string()),
    details: s.optional(s.string())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Обновление проекта`,
      payload: { id: req.body.id }
    })
    try {
      const project = await tasksRepo.updateProject(ctx, user.id, req.body.id, {
        name: req.body.name,
        ...(req.body.clientId !== undefined ? { clientId: req.body.clientId } : {}),
        ...(req.body.details !== undefined ? { details: req.body.details } : {})
      })
      if (!project) {
        return { success: false, error: 'Проект или клиент не найдены' }
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
