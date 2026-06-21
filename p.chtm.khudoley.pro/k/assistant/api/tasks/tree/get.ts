// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as tasksRepo from '../../../repos/tasks.repo'

const LOG_PATH = 'api/tasks/tree/get'

/**
 * GET /api/tasks/tree/get — полное дерево клиентов, проектов и задач текущего пользователя.
 */
export const getTasksTreeRoute = app.get('/', async (ctx, _req) => {
  const user = requireRealUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос дерева задач`,
    payload: {}
  })

  try {
    const tree = await tasksRepo.getTreeForUser(ctx, user.id)
    return { success: true, tree }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error), tree: { clients: [], projects: [], tasks: [] } }
  }
})
