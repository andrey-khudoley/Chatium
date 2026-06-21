// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as tasksRepo from '../../../repos/tasks.repo'
import type { TaskStatus } from '../../../tables/task-items.table'
import { TASK_STATUSES } from '../../../tables/task-items.table'

const LOG_PATH = 'api/tasks/items/update'

function parseStatus(v: unknown): TaskStatus | undefined {
  if (typeof v !== 'string') return undefined
  return TASK_STATUSES.includes(v as TaskStatus) ? (v as TaskStatus) : undefined
}

export const updateTaskItemRoute = app
  .body((s) => ({
    id: s.string(),
    title: s.optional(s.string()),
    details: s.optional(s.string()),
    priority: s.optional(s.number()),
    status: s.optional(s.string()),
    projectId: s.optional(s.string()),
    eventAtMs: s.optional(s.nullable(s.number())),
    reminderMinutesBefore: s.optional(s.number())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Обновление задачи`,
      payload: { id: req.body.id }
    })
    try {
      const status = parseStatus(req.body.status)
      const task = await tasksRepo.updateTask(ctx, user.id, req.body.id, {
        ...(req.body.title !== undefined ? { title: req.body.title } : {}),
        ...(req.body.details !== undefined ? { details: req.body.details } : {}),
        ...(req.body.priority !== undefined ? { priority: req.body.priority } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(req.body.projectId !== undefined ? { projectId: req.body.projectId } : {}),
        ...(req.body.eventAtMs !== undefined ? { eventAtMs: req.body.eventAtMs } : {}),
        ...(req.body.reminderMinutesBefore !== undefined
          ? { reminderMinutesBefore: req.body.reminderMinutesBefore }
          : {})
      })
      if (!task) {
        return { success: false, error: 'Задача или проект не найдены' }
      }
      return { success: true, task }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
