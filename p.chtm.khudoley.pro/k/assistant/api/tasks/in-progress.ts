// @shared-route
import { requireRealUser } from '@app/auth'
import * as tasksRepo from '../../repos/tasks.repo'

export const getInProgressTasksRoute = app.get('/', async (ctx) => {
  const user = requireRealUser(ctx)
  try {
    const tree = await tasksRepo.getTreeForUser(ctx, user.id)
    const projectById = new Map(tree.projects.map((project) => [project.id, project]))
    const clientById = new Map(tree.clients.map((client) => [client.id, client]))
    const inProgressTasks = tree.tasks
      .filter((task) => task.status === 'in_progress')
      .map((task) => {
        const project = projectById.get(task.projectId)
        const client = project ? clientById.get(project.clientId) : null
        return {
          ...task,
          projectName: project?.name ?? '',
          clientName: client?.name ?? ''
        }
      })
    return { success: true, tasks: inProgressTasks }
  } catch (error) {
    ctx.account.log(`tasks.in-progress error`, {
      level: 'error',
      json: { userId: user.id, error: String(error) }
    })
    return { success: false, error: 'Не удалось получить список задач' }
  }
})
