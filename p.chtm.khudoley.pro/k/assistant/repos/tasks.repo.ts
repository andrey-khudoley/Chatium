import { TaskClients } from '../tables/task-clients.table'
import { TaskProjects } from '../tables/task-projects.table'
import { TaskItems, TASK_STATUSES } from '../tables/task-items.table'
import type { TaskClientDto, TaskItemDto, TaskProjectDto, TasksTreeDto, TaskStatus } from '../lib/tasks-types'
import type { TaskProjectsRow } from '../tables/task-projects.table'
import type { TaskItemsRow } from '../tables/task-items.table'

export type { TaskClientDto, TaskItemDto, TaskProjectDto, TasksTreeDto, TaskStatus } from '../lib/tasks-types'

function normalizePriority(n: number): number {
  if (!Number.isFinite(n)) return 2
  const x = Math.round(n)
  return Math.min(4, Math.max(1, x))
}

function normalizeStatus(s: string): TaskStatus {
  return TASK_STATUSES.includes(s as TaskStatus) ? (s as TaskStatus) : 'todo'
}

function rowToClient(row: { id: string; name: string; sortOrder: number }): TaskClientDto {
  return { id: row.id, name: row.name, sortOrder: row.sortOrder }
}

const HEAP_OPTIONAL_DETAILS_TEXT_MAX_LEN = 10_000

function rowToProject(row: {
  id: string
  clientId: string
  name: string
  sortOrder: number
  details?: string | null
  context?: string | null
}): TaskProjectDto {
  return {
    id: row.id,
    clientId: row.clientId,
    name: row.name,
    details: row.details ?? '',
    context: row.context ?? '',
    sortOrder: row.sortOrder
  }
}

/** Для Heap.Optional(String) «Детали» у проектов и задач: trim, длина, пустое — unset. */
function normalizeHeapOptionalDetailsText(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined
  const t = raw.trim()
  if (!t) return undefined
  return t.length > HEAP_OPTIONAL_DETAILS_TEXT_MAX_LEN
    ? t.slice(0, HEAP_OPTIONAL_DETAILS_TEXT_MAX_LEN)
    : t
}

function normalizeDaySortOrder(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0
  return Math.floor(n)
}

function normalizeReminderMinutesBefore(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 15
  const rounded = Math.round(n)
  return Math.min(60 * 24 * 14, Math.max(0, rounded))
}

function normalizeEventAtMs(n: unknown): number | undefined {
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined
  const rounded = Math.round(n)
  return rounded > 0 ? rounded : undefined
}

function rowToTask(row: {
  id: string
  projectId: string
  title: string
  details?: string | null
  context?: string | null
  priority: number
  status: string
  sortOrder: number
  daySortOrder?: number
  pomodoroWorkSec?: number
  pomodoroRestSec?: number
  eventAtMs?: number | null
  reminderMinutesBefore?: number
}): TaskItemDto {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    details: row.details ?? '',
    context: row.context ?? '',
    priority: normalizePriority(row.priority),
    status: normalizeStatus(row.status),
    sortOrder: row.sortOrder,
    daySortOrder: normalizeDaySortOrder(row.daySortOrder),
    pomodoroWorkSec: Math.max(0, Math.floor(row.pomodoroWorkSec ?? 0)),
    pomodoroRestSec: Math.max(0, Math.floor(row.pomodoroRestSec ?? 0)),
    eventAtMs: row.eventAtMs ?? null,
    reminderMinutesBefore: normalizeReminderMinutesBefore(row.reminderMinutesBefore)
  }
}

export async function getTreeForUser(ctx: app.Ctx, userId: string): Promise<TasksTreeDto> {
  const [clients, projects, tasks] = await Promise.all([
    TaskClients.findAll(ctx, {
      where: { userId },
      order: [{ sortOrder: 'asc' }]
    }),
    TaskProjects.findAll(ctx, {
      where: { userId },
      order: [{ sortOrder: 'asc' }]
    }),
    TaskItems.findAll(ctx, {
      where: { userId },
      order: [{ sortOrder: 'asc' }]
    })
  ])

  return {
    clients: clients.map(rowToClient),
    projects: projects.map(rowToProject),
    tasks: tasks.map(rowToTask)
  }
}

async function nextClientSortOrder(ctx: app.Ctx, userId: string): Promise<number> {
  const rows = await TaskClients.findAll(ctx, {
    where: { userId },
    order: [{ sortOrder: 'desc' }],
    limit: 1
  })
  const max = rows[0]?.sortOrder ?? 0
  return max + 1
}

async function nextProjectSortOrder(ctx: app.Ctx, userId: string, clientId: string): Promise<number> {
  const rows = await TaskProjects.findAll(ctx, {
    where: { userId, clientId },
    order: [{ sortOrder: 'desc' }],
    limit: 1
  })
  const max = rows[0]?.sortOrder ?? 0
  return max + 1
}

async function nextTaskSortOrder(ctx: app.Ctx, userId: string, projectId: string): Promise<number> {
  const rows = await TaskItems.findAll(ctx, {
    where: { userId, projectId },
    order: [{ sortOrder: 'desc' }],
    limit: 1
  })
  const max = rows[0]?.sortOrder ?? 0
  return max + 1
}

async function nextDaySortOrder(ctx: app.Ctx, userId: string): Promise<number> {
  const rows = await TaskItems.findAll(ctx, {
    where: { userId, status: 'in_progress' },
    order: [{ daySortOrder: 'desc' }],
    limit: 1
  })
  const max = rows[0]?.daySortOrder ?? 0
  return max + 1
}

async function assertClientOwner(ctx: app.Ctx, userId: string, id: string) {
  const row = await TaskClients.findById(ctx, id)
  if (!row || row.userId !== userId) return null
  return row
}

async function assertProjectOwner(ctx: app.Ctx, userId: string, id: string) {
  const row = await TaskProjects.findById(ctx, id)
  if (!row || row.userId !== userId) return null
  return row
}

async function assertTaskOwner(ctx: app.Ctx, userId: string, id: string) {
  const row = await TaskItems.findById(ctx, id)
  if (!row || row.userId !== userId) return null
  return row
}

export async function findTaskByIdForUser(ctx: app.Ctx, userId: string, id: string): Promise<TaskItemDto | null> {
  const row = await assertTaskOwner(ctx, userId, id)
  return row ? rowToTask(row) : null
}

export async function createClient(ctx: app.Ctx, userId: string, name: string): Promise<TaskClientDto> {
  const sortOrder = await nextClientSortOrder(ctx, userId)
  const row = await TaskClients.create(ctx, {
    userId,
    name: name.trim() || 'Новый клиент',
    sortOrder
  })
  return rowToClient(row)
}

export async function updateClient(
  ctx: app.Ctx,
  userId: string,
  id: string,
  data: { name: string }
): Promise<TaskClientDto | null> {
  const existing = await assertClientOwner(ctx, userId, id)
  if (!existing) return null
  const row = await TaskClients.update(ctx, { id, name: data.name.trim() || existing.name })
  return rowToClient(row)
}

export async function deleteClient(ctx: app.Ctx, userId: string, id: string): Promise<boolean> {
  const existing = await assertClientOwner(ctx, userId, id)
  if (!existing) return false

  const projects = await TaskProjects.findAll(ctx, { where: { userId, clientId: id } })
  for (const p of projects) {
    const tasks = await TaskItems.findAll(ctx, { where: { userId, projectId: p.id } })
    for (const t of tasks) {
      await TaskItems.delete(ctx, t.id)
    }
    await TaskProjects.delete(ctx, p.id)
  }
  await TaskClients.delete(ctx, id)
  return true
}

export async function createProject(
  ctx: app.Ctx,
  userId: string,
  clientId: string,
  name: string,
  details?: string,
  context?: string
): Promise<TaskProjectDto | null> {
  const client = await assertClientOwner(ctx, userId, clientId)
  if (!client) return null
  const sortOrder = await nextProjectSortOrder(ctx, userId, clientId)
  const d = normalizeHeapOptionalDetailsText(details)
  const c = normalizeHeapOptionalDetailsText(context)
  const row = await TaskProjects.create(ctx, {
    userId,
    clientId,
    name: name.trim() || 'Новый проект',
    sortOrder,
    ...(d !== undefined ? { details: d } : {}),
    ...(c !== undefined ? { context: c } : {})
  })
  return rowToProject(row)
}

export async function updateProject(
  ctx: app.Ctx,
  userId: string,
  id: string,
  data: { name: string; clientId?: string; details?: string; context?: string }
): Promise<TaskProjectDto | null> {
  const existing = await assertProjectOwner(ctx, userId, id)
  if (!existing) return null
  let clientId = existing.clientId
  if (data.clientId !== undefined && data.clientId !== existing.clientId) {
    const c = await assertClientOwner(ctx, userId, data.clientId)
    if (!c) return null
    clientId = data.clientId
  }
  const sortOrder =
    clientId === existing.clientId
      ? existing.sortOrder
      : await nextProjectSortOrder(ctx, userId, clientId)
  const detailsPatch =
    data.details !== undefined
      ? {
          /** `null` сбрасывает Heap.Optional (см. inner/docs/008-heap.md, опциональные поля). */
          details: normalizeHeapOptionalDetailsText(data.details) ?? (null as TaskProjectsRow['details'])
        }
      : {}
  const contextPatch =
    data.context !== undefined
      ? {
          context: normalizeHeapOptionalDetailsText(data.context) ?? (null as TaskProjectsRow['context'])
        }
      : {}
  const row = await TaskProjects.update(ctx, {
    id,
    name: data.name.trim() || existing.name,
    clientId,
    sortOrder,
    ...detailsPatch,
    ...contextPatch
  })
  return rowToProject(row)
}

export async function deleteProject(ctx: app.Ctx, userId: string, id: string): Promise<boolean> {
  const existing = await assertProjectOwner(ctx, userId, id)
  if (!existing) return false
  const tasks = await TaskItems.findAll(ctx, { where: { userId, projectId: id } })
  for (const t of tasks) {
    await TaskItems.delete(ctx, t.id)
  }
  await TaskProjects.delete(ctx, id)
  return true
}

export async function createTask(
  ctx: app.Ctx,
  userId: string,
  projectId: string,
  data: {
    title: string
    details?: string
    context?: string
    priority?: number
    status?: TaskStatus
    eventAtMs?: number
    reminderMinutesBefore?: number
  }
): Promise<TaskItemDto | null> {
  const project = await assertProjectOwner(ctx, userId, projectId)
  if (!project) return null
  const sortOrder = await nextTaskSortOrder(ctx, userId, projectId)
  const priority = normalizePriority(data.priority ?? 2)
  const status = data.status ? normalizeStatus(data.status) : 'todo'
  const daySortOrder = status === 'in_progress' ? await nextDaySortOrder(ctx, userId) : 0
  const d = normalizeHeapOptionalDetailsText(
    typeof data.details === 'string' ? data.details : undefined
  )
  const c = normalizeHeapOptionalDetailsText(
    typeof data.context === 'string' ? data.context : undefined
  )
  const eventAtMs = normalizeEventAtMs(data.eventAtMs)
  const reminderMinutesBefore = normalizeReminderMinutesBefore(data.reminderMinutesBefore)
  const row = await TaskItems.create(ctx, {
    userId,
    projectId,
    title: data.title.trim() || 'Новая задача',
    priority,
    status,
    sortOrder,
    daySortOrder,
    pomodoroWorkSec: 0,
    pomodoroRestSec: 0,
    reminderMinutesBefore,
    ...(d !== undefined ? { details: d } : {}),
    ...(c !== undefined ? { context: c } : {}),
    ...(eventAtMs !== undefined ? { eventAtMs } : {})
  })
  return rowToTask(row)
}

export async function addPomodoroSecondsToTask(
  ctx: app.Ctx,
  userId: string,
  taskId: string,
  addWorkSec: number,
  addRestSec: number
): Promise<void> {
  const task = await assertTaskOwner(ctx, userId, taskId)
  if (!task) return
  const nextWork = Math.max(0, Math.floor((task.pomodoroWorkSec ?? 0) + addWorkSec))
  const nextRest = Math.max(0, Math.floor((task.pomodoroRestSec ?? 0) + addRestSec))
  await TaskItems.update(ctx, { id: task.id, pomodoroWorkSec: nextWork, pomodoroRestSec: nextRest })
}

export async function updateTask(
  ctx: app.Ctx,
  userId: string,
  id: string,
  data: {
    title?: string
    details?: string
    context?: string
    priority?: number
    status?: TaskStatus
    projectId?: string
    eventAtMs?: number | null
    reminderMinutesBefore?: number
  }
): Promise<TaskItemDto | null> {
  const existing = await assertTaskOwner(ctx, userId, id)
  if (!existing) return null
  let projectId = existing.projectId
  if (data.projectId !== undefined && data.projectId !== existing.projectId) {
    const p = await assertProjectOwner(ctx, userId, data.projectId)
    if (!p) return null
    projectId = data.projectId
  }
  let sortOrder = existing.sortOrder
  if (projectId !== existing.projectId) {
    sortOrder = await nextTaskSortOrder(ctx, userId, projectId)
  }
  const nextStatus =
    data.status !== undefined ? normalizeStatus(data.status) : normalizeStatus(existing.status)
  let daySortOrderPatch: { daySortOrder: number } | undefined
  if (data.status !== undefined) {
    if (nextStatus === 'in_progress' && existing.status !== 'in_progress') {
      daySortOrderPatch = { daySortOrder: await nextDaySortOrder(ctx, userId) }
    } else if (nextStatus !== 'in_progress' && existing.status === 'in_progress') {
      daySortOrderPatch = { daySortOrder: 0 }
    }
  }
  const detailsPatch =
    data.details !== undefined
      ? {
          details:
            normalizeHeapOptionalDetailsText(data.details) ?? (null as TaskItemsRow['details'])
        }
      : {}
  const contextPatch =
    data.context !== undefined
      ? {
          context:
            normalizeHeapOptionalDetailsText(data.context) ?? (null as TaskItemsRow['context'])
        }
      : {}
  const eventPatch =
    data.eventAtMs !== undefined
      ? {
          eventAtMs: normalizeEventAtMs(data.eventAtMs) ?? (null as TaskItemsRow['eventAtMs'])
        }
      : {}
  const reminderPatch =
    data.reminderMinutesBefore !== undefined
      ? {
          reminderMinutesBefore: normalizeReminderMinutesBefore(data.reminderMinutesBefore)
        }
      : {}
  const patch = {
    ...(data.title !== undefined ? { title: data.title.trim() || existing.title } : {}),
    ...detailsPatch,
    ...contextPatch,
    ...(data.priority !== undefined ? { priority: normalizePriority(data.priority) } : {}),
    ...(data.status !== undefined ? { status: nextStatus } : {}),
    ...(projectId !== existing.projectId ? { projectId, sortOrder } : {}),
    ...(daySortOrderPatch ?? {}),
    ...eventPatch,
    ...reminderPatch
  }
  if (Object.keys(patch).length === 0) {
    return rowToTask(existing)
  }
  const row = await TaskItems.update(ctx, { id, ...patch })
  return rowToTask(row)
}

export async function reorderDayTasks(
  ctx: app.Ctx,
  userId: string,
  orderedIds: string[]
): Promise<boolean> {
  const tasks = await TaskItems.findAll(ctx, { where: { userId, status: 'in_progress' } })
  const idSet = new Set(tasks.map((t) => t.id))
  if (orderedIds.length !== idSet.size || orderedIds.some((id) => !idSet.has(id))) {
    return false
  }
  const offset = 1_000_000
  let i = 0
  for (const taskId of orderedIds) {
    await TaskItems.update(ctx, { id: taskId, daySortOrder: offset + i })
    i++
  }
  i = 0
  for (const taskId of orderedIds) {
    await TaskItems.update(ctx, { id: taskId, daySortOrder: i })
    i++
  }
  return true
}

/** Все задачи «В работе» → «К выполнению» (очистка дневного списка). */
export async function releaseAllInProgressToTodo(ctx: app.Ctx, userId: string): Promise<number> {
  const tasks = await TaskItems.findAll(ctx, { where: { userId, status: 'in_progress' } })
  for (const t of tasks) {
    await TaskItems.update(ctx, { id: t.id, status: 'todo', daySortOrder: 0 })
  }
  return tasks.length
}

export async function deleteTask(ctx: app.Ctx, userId: string, id: string): Promise<boolean> {
  const existing = await assertTaskOwner(ctx, userId, id)
  if (!existing) return false
  await TaskItems.delete(ctx, id)
  return true
}

export async function reorderTasks(
  ctx: app.Ctx,
  userId: string,
  projectId: string,
  orderedIds: string[]
): Promise<boolean> {
  const project = await assertProjectOwner(ctx, userId, projectId)
  if (!project) return false
  const tasks = await TaskItems.findAll(ctx, { where: { userId, projectId } })
  const idSet = new Set(tasks.map((t) => t.id))
  if (orderedIds.length !== idSet.size || orderedIds.some((id) => !idSet.has(id))) {
    return false
  }
  // Два прохода: иначе при уникальном (projectId, sortOrder) первая же смена может
  // конфликтовать с соседней строкой, которая ещё держит старый порядок.
  const offset = 1_000_000
  let i = 0
  for (const taskId of orderedIds) {
    await TaskItems.update(ctx, { id: taskId, sortOrder: offset + i })
    i++
  }
  i = 0
  for (const taskId of orderedIds) {
    await TaskItems.update(ctx, { id: taskId, sortOrder: i })
    i++
  }
  return true
}

export async function reorderClients(ctx: app.Ctx, userId: string, orderedIds: string[]): Promise<boolean> {
  const clients = await TaskClients.findAll(ctx, { where: { userId } })
  const idSet = new Set(clients.map((c) => c.id))
  if (orderedIds.length !== idSet.size || orderedIds.some((id) => !idSet.has(id))) {
    return false
  }
  const offset = 1_000_000
  let i = 0
  for (const id of orderedIds) {
    await TaskClients.update(ctx, { id, sortOrder: offset + i })
    i++
  }
  i = 0
  for (const id of orderedIds) {
    await TaskClients.update(ctx, { id, sortOrder: i })
    i++
  }
  return true
}

export async function reorderProjects(
  ctx: app.Ctx,
  userId: string,
  clientId: string,
  orderedIds: string[]
): Promise<boolean> {
  const client = await assertClientOwner(ctx, userId, clientId)
  if (!client) return false
  const projects = await TaskProjects.findAll(ctx, { where: { userId, clientId } })
  const idSet = new Set(projects.map((p) => p.id))
  if (orderedIds.length !== idSet.size || orderedIds.some((id) => !idSet.has(id))) {
    return false
  }
  const offset = 1_000_000
  let i = 0
  for (const id of orderedIds) {
    await TaskProjects.update(ctx, { id, sortOrder: offset + i })
    i++
  }
  i = 0
  for (const id of orderedIds) {
    await TaskProjects.update(ctx, { id, sortOrder: i })
    i++
  }
  return true
}

export type CompletedTaskSummaryDto = {
  id: string
  title: string
  projectName: string
  clientName: string
  dayKey: string
}

function heapDateToMs(d: unknown): number {
  if (d instanceof Date) return d.getTime()
  if (typeof d === 'number') return d
  if (typeof d === 'string') return new Date(d).getTime()
  return 0
}

function msToDayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function getCompletedTasksSummaryForMonth(
  ctx: app.Ctx,
  userId: string,
  year: number,
  month: number
): Promise<CompletedTaskSummaryDto[]> {
  const monthStartMs = new Date(year, month - 1, 1).getTime()
  const monthEndMs = new Date(year, month, 1).getTime()

  const tasks = await TaskItems.findAll(ctx, { where: { userId, status: 'done' } })
  const projects = await TaskProjects.findAll(ctx, { where: { userId } })
  const clients = await TaskClients.findAll(ctx, { where: { userId } })
  const projectMap = new Map(projects.map((p) => [p.id, p]))
  const clientMap = new Map(clients.map((c) => [c.id, c]))

  const result: CompletedTaskSummaryDto[] = []
  for (const task of tasks) {
    const updatedMs = heapDateToMs((task as Record<string, unknown>).updatedAt)
    if (updatedMs >= monthStartMs && updatedMs < monthEndMs) {
      const project = projectMap.get(task.projectId)
      const client = project ? clientMap.get(project.clientId) : null
      result.push({
        id: task.id,
        title: task.title,
        projectName: project?.name ?? '',
        clientName: client?.name ?? '',
        dayKey: msToDayKey(updatedMs)
      })
    }
  }
  return result
}
