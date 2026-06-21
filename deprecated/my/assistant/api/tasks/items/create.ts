// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as tasksRepo from '../../../repos/tasks.repo'
import type { TaskStatus } from '../../../tables/task-items.table'
import { TASK_STATUSES } from '../../../tables/task-items.table'

const LOG_PATH = 'api/tasks/items/create'

function parseStatus(v: unknown): TaskStatus | undefined {
  if (typeof v !== 'string') return undefined
  return TASK_STATUSES.includes(v as TaskStatus) ? (v as TaskStatus) : undefined
}

export const createTaskItemRoute = app
  .body((s) => ({
    projectId: s.string(),
    title: s.string(),
    details: s.optional(s.string()),
    priority: s.optional(s.number()),
    status: s.optional(s.string()),
    eventAtMs: s.optional(s.nullable(s.number())),
    reminderMinutesBefore: s.optional(s.number())
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Создание задачи`,
      payload: { projectId: req.body.projectId }
    })
    try {
      const task = await tasksRepo.createTask(ctx, user.id, req.body.projectId, {
        title: req.body.title,
        details: req.body.details,
        priority: req.body.priority,
        status: parseStatus(req.body.status),
        ...(req.body.eventAtMs !== undefined ? { eventAtMs: req.body.eventAtMs ?? undefined } : {}),
        ...(req.body.reminderMinutesBefore !== undefined
          ? { reminderMinutesBefore: req.body.reminderMinutesBefore }
          : {})
      })
      if (!task) {
        return { success: false, error: 'Проект не найден' }
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
