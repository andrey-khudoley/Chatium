// @shared
import * as loggerLib from '../../lib/logger.lib'
import * as tasksRepo from '../../repos/tasks.repo'

const LOG_PATH = 'api/tasks/tasks-ai-formulate-apply'

function normalizeAiPriority(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined
  const x = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(x)) return undefined
  const n = Math.round(x)
  if (n < 1 || n > 4) return undefined
  return n
}

function normalizeAiEventAtMs(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined
  const x = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(x)) return undefined
  const rounded = Math.round(x)
  return rounded > 0 ? rounded : undefined
}

function normalizeAiReminderMinutesBefore(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined
  const x = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(x)) return undefined
  const n = Math.round(x)
  if (n < 0 || n > 60 * 24 * 14) return undefined
  return n
}

export type AiUpdateProject = {
  type: 'update_project'
  context: string
}

export type AiUpdateTask = {
  type: 'update_task'
  taskId: string
  title?: string
  context?: string
  details?: string
  priority?: number
  eventAtMs?: number
  reminderMinutesBefore?: number
}

export type AiCreateTask = {
  type: 'create_task'
  title: string
  details?: string
  context?: string
  priority?: number
  eventAtMs?: number
  reminderMinutesBefore?: number
}

export type AiDeleteTask = {
  type: 'delete_task'
  taskId: string
}

export type AiReorderTasks = {
  type: 'reorder_tasks'
  orderedTaskIds: string[]
}

export type AiAction = AiUpdateProject | AiUpdateTask | AiCreateTask | AiDeleteTask | AiReorderTasks

const NEW_TASK_PLACEHOLDER = /^\$new:(\d+)$/

function resolveReorderOrderedIds(orderedTaskIds: string[], newTaskIdsInCreateOrder: string[]): string[] | null {
  const out: string[] = []
  for (const token of orderedTaskIds) {
    const m = NEW_TASK_PLACEHOLDER.exec(token.trim())
    if (m) {
      const i = parseInt(m[1], 10)
      if (!Number.isFinite(i) || i < 0 || i >= newTaskIdsInCreateOrder.length) {
        return null
      }
      const id = newTaskIdsInCreateOrder[i]
      if (!id) return null
      out.push(id)
    } else {
      out.push(token.trim())
    }
  }
  return out
}

/** Ответ модели: JSON из чата задач (поле reply) или legacy только formulate. */
export type AiFormulateJsonResponse = {
  reply?: string
  actions: AiAction[]
  summary: string
}

export function stripJsonFences(text: string): string {
  let t = text.trim()
  if (t.startsWith('```')) {
    const firstNl = t.indexOf('\n')
    if (firstNl !== -1) {
      t = t.slice(firstNl + 1)
    }
    const end = t.lastIndexOf('```')
    if (end !== -1) {
      t = t.slice(0, end)
    }
  }
  return t.trim()
}

/**
 * Разбирает тело ответа completion. Возвращает null, если это не JSON с полями summary/actions.
 */
export function parseAiFormulateJsonFromText(raw: string): AiFormulateJsonResponse | null {
  const text = stripJsonFences(raw)
  try {
    const obj = JSON.parse(text) as Record<string, unknown>
    if (!obj || typeof obj !== 'object') return null
    const replyRaw = typeof obj.reply === 'string' ? obj.reply.trim() : ''
    const summaryRaw = typeof obj.summary === 'string' ? obj.summary.trim() : ''
    const summary = summaryRaw || replyRaw
    if (!summary) return null
    const actions = Array.isArray(obj.actions) ? (obj.actions as AiAction[]) : []
    return { reply: replyRaw || undefined, actions, summary }
  } catch {
    return null
  }
}

export type ApplyAiFormulateStats = {
  projectUpdated: boolean
  createdTasks: string[]
  updatedTasks: string[]
  deletedTasks: string[]
  tasksReordered: boolean
}

/**
 * Применяет actions к проекту (та же логика, что была в callback `ai-formulate`).
 */
export async function applyAiFormulateJsonResponse(
  ctx: app.Ctx,
  userId: string,
  projectId: string,
  aiResponse: AiFormulateJsonResponse
): Promise<ApplyAiFormulateStats> {
  const tree = await tasksRepo.getTreeForUser(ctx, userId)
  const project = tree.projects.find((p) => p.id === projectId)
  if (!project) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] проект не найден`,
      payload: { projectId }
    })
    return {
      projectUpdated: false,
      createdTasks: [],
      updatedTasks: [],
      deletedTasks: [],
      tasksReordered: false
    }
  }

  const projectTasks = tree.tasks.filter((t) => t.projectId === project.id)
  const actions = Array.isArray(aiResponse.actions) ? aiResponse.actions : []
  const taskTitleById = new Map(projectTasks.map((t) => [t.id, t.title]))

  const reorderSpecs = actions.filter((a): a is AiReorderTasks => a.type === 'reorder_tasks')
  const reorderSpec = reorderSpecs.length ? reorderSpecs[reorderSpecs.length - 1] : null

  const createdTasks: string[] = []
  const updatedTasks: string[] = []
  const deletedTasks: string[] = []
  let projectUpdated = false
  let tasksReordered = false

  const runAction = async (action: AiUpdateProject | AiUpdateTask | AiDeleteTask) => {
    if (action.type === 'update_project') {
      await tasksRepo.updateProject(ctx, userId, project.id, {
        name: project.name,
        context: action.context
      })
      projectUpdated = true
      return
    }
    if (action.type === 'update_task') {
      const pr = normalizeAiPriority(action.priority)
      const eventAtMs = normalizeAiEventAtMs(action.eventAtMs)
      const reminderMinutesBefore = normalizeAiReminderMinutesBefore(action.reminderMinutesBefore)
      const updated = await tasksRepo.updateTask(ctx, userId, action.taskId, {
        ...(action.title !== undefined ? { title: action.title } : {}),
        ...(action.context !== undefined ? { context: action.context } : {}),
        ...(action.details !== undefined ? { details: action.details } : {}),
        ...(pr !== undefined ? { priority: pr } : {}),
        ...(eventAtMs !== undefined ? { eventAtMs } : {}),
        ...(reminderMinutesBefore !== undefined ? { reminderMinutesBefore } : {})
      })
      if (updated) {
        updatedTasks.push(updated.title)
        taskTitleById.set(updated.id, updated.title)
      }
      return
    }
    if (action.type === 'delete_task') {
      const title = taskTitleById.get(action.taskId) ?? action.taskId
      const ok = await tasksRepo.deleteTask(ctx, userId, action.taskId)
      if (ok) {
        deletedTasks.push(title)
        taskTitleById.delete(action.taskId)
      }
    }
  }

  for (const action of actions) {
    if (action.type === 'reorder_tasks' || action.type === 'create_task') continue
    try {
      await runAction(action)
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] ошибка действия`,
        payload: { action, error: String(error) }
      })
    }
  }

  const newTaskIdsInCreateOrder: string[] = []
  for (const action of actions) {
    if (action.type !== 'create_task') continue
    try {
      const pr = normalizeAiPriority(action.priority)
      const eventAtMs = normalizeAiEventAtMs(action.eventAtMs)
      const reminderMinutesBefore = normalizeAiReminderMinutesBefore(action.reminderMinutesBefore)
      const created = await tasksRepo.createTask(ctx, userId, project.id, {
        title: action.title,
        details: action.details,
        context: action.context,
        ...(pr !== undefined ? { priority: pr } : {}),
        ...(eventAtMs !== undefined ? { eventAtMs } : {}),
        ...(reminderMinutesBefore !== undefined ? { reminderMinutesBefore } : {})
      })
      if (created) {
        createdTasks.push(created.title)
        taskTitleById.set(created.id, created.title)
        newTaskIdsInCreateOrder.push(created.id)
      }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] ошибка create_task`,
        payload: { action, error: String(error) }
      })
    }
  }

  if (reorderSpec && Array.isArray(reorderSpec.orderedTaskIds)) {
    const resolved = resolveReorderOrderedIds(reorderSpec.orderedTaskIds, newTaskIdsInCreateOrder)
    if (!resolved) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] reorder_tasks: не удалось разрешить $new:N`,
        payload: { orderedTaskIds: reorderSpec.orderedTaskIds, newTasksCount: newTaskIdsInCreateOrder.length }
      })
    } else {
      const ok = await tasksRepo.reorderTasks(ctx, userId, project.id, resolved)
      if (ok) {
        tasksReordered = true
      } else {
        await loggerLib.writeServerLog(ctx, {
          severity: 4,
          message: `[${LOG_PATH}] reorder_tasks: reorderTasks вернул false`,
          payload: { resolvedCount: resolved.length }
        })
      }
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] применено`,
    payload: {
      projectUpdated,
      createdCount: createdTasks.length,
      updatedCount: updatedTasks.length,
      deletedCount: deletedTasks.length,
      tasksReordered,
      summary: aiResponse.summary
    }
  })

  return {
    projectUpdated,
    createdTasks,
    updatedTasks,
    deletedTasks,
    tasksReordered
  }
}
