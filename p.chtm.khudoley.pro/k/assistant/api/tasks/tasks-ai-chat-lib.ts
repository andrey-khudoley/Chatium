import { findUsersByIds, type SmartUser } from '@app/auth'
import { createFeedMessage } from '@app/feed'
import { taskAiChatMsgTime } from '../../shared/tasks-ai-chat-message-order'
import * as taskAiChatRepo from '../../repos/task-ai-chat.repo'
import * as tasksRepo from '../../repos/tasks.repo'

export { taskAiChatMsgTime }

const PRIORITY_LINE: Record<number, string> = {
  1: '1 — Срочно',
  2: '2 — Высокий',
  3: '3 — Обычный',
  4: '4 — Низкий'
}

export type TaskAiChatFeedMsg = {
  id?: string
  text?: string | null
  data?: { assistant?: boolean } | null
  createdAt?: number | Date | null
  author?: { id?: string; name?: string; avatar?: Record<string, unknown> }
  replyTo?: { author?: { id?: string; name?: string; avatar?: Record<string, unknown> } } | null
  isOutgoing?: boolean
}

export function mapAuthorForTaskAiChat(
  author: TaskAiChatFeedMsg['author'],
  currentUser: SmartUser,
  smartUsersMap: Map<string, SmartUser>
) {
  if (!author) return
  if (!author.avatar) author.avatar = {}

  const isCurrentUser = author.id === currentUser.id
  const smartUser = author.id ? smartUsersMap.get(author.id) : undefined

  if (isCurrentUser) {
    author.name =
      smartUser?.firstName || smartUser?.lastName
        ? [smartUser?.firstName, smartUser?.lastName].filter(Boolean).join(' ')
        : 'Вы'

    author.avatar = author.avatar || {}
    author.avatar.image = currentUser.getImageThumbnailUrl ? currentUser.getImageThumbnailUrl(200) : undefined
  } else {
    author.name =
      smartUser?.firstName || smartUser?.lastName
        ? [smartUser?.firstName, smartUser?.lastName].filter(Boolean).join(' ')
        : 'Участник'

    if (smartUser?.hasImage && smartUser.getImageThumbnailUrl) {
      author.avatar = author.avatar || {}
      author.avatar.image = smartUser.getImageThumbnailUrl(200)
    }
  }

  author.avatar.bgColor = '#4726C3'
}

export function mapTaskAiChatMessage(
  msg: TaskAiChatFeedMsg,
  currentUser: SmartUser,
  smartUsersMap: Map<string, SmartUser>
) {
  const assistant = Boolean(msg.data?.assistant)
  if (assistant) {
    mapAuthorForTaskAiChat(msg.author, currentUser, smartUsersMap)
    if (msg.author) {
      msg.author.name = 'Ассистент'
      msg.author.avatar = { ...(msg.author.avatar || {}), iconCssClass: 'fas fa-robot', bgColor: '#1a3a2f' }
    }
    msg.isOutgoing = false
  } else {
    mapAuthorForTaskAiChat(msg.author, currentUser, smartUsersMap)
    msg.isOutgoing = msg.author?.id === currentUser.id
  }

  if (msg.replyTo?.author) {
    mapAuthorForTaskAiChat(msg.replyTo.author, currentUser, smartUsersMap)
  }
}

export async function assertTaskAiChatFeedAccess(ctx: app.Ctx, user: SmartUser, feedId: string) {
  const mapping = await taskAiChatRepo.findFeedMappingByFeedId(ctx, feedId, user.id)
  if (!mapping) {
    throw new Error('Нет доступа к этому чату')
  }
}

export async function buildTaskAiChatProjectContextBlock(
  ctx: app.Ctx,
  userId: string,
  projectId: string
): Promise<string> {
  const tree = await tasksRepo.getTreeForUser(ctx, userId)
  const project = tree.projects.find((p) => p.id === projectId)
  if (!project) {
    return 'Проект не найден.'
  }

  const projectTasks = tree.tasks.filter((t) => t.projectId === projectId)
  const parts: string[] = []
  parts.push('ТЕКУЩИЙ ПРОЕКТ:')
  parts.push(
    'Дальше в этом блоке — задачи с id, приоритетом, статусом, деталями и служебным контекстом каждой строки. Служебный контекст проекта (в БД) — для общей рамки и терминов; не дублируй здесь перечень задач.'
  )
  parts.push(`Название: ${project.name}`)
  if (project.details) parts.push(`Детали: ${project.details}`)
  if (project.context) parts.push(`Контекст (служебный): ${project.context}`)

  if (projectTasks.length) {
    const ordered = [...projectTasks].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
    parts.push('\nЗАДАЧИ ПРОЕКТА (порядок списка):')
    ordered.forEach((task, index) => {
      parts.push(`\n[${index + 1}] [ID: ${task.id}] ${task.title}`)
      parts.push(`Приоритет: ${PRIORITY_LINE[task.priority] ?? task.priority}; статус: ${task.status}`)
      if (task.eventAtMs) {
        const eventAtIso = new Date(task.eventAtMs).toISOString()
        parts.push(
          `Событие: ${eventAtIso}; напоминание за ${Math.max(0, task.reminderMinutesBefore)} мин`
        )
      }
      if (task.details) parts.push(`Детали: ${task.details}`)
      if (task.context) parts.push(`Контекст задачи (служебный): ${task.context}`)
    })
  } else {
    parts.push('\nВ проекте пока нет задач.')
  }

  return parts.join('\n')
}

function mergeAdjacentSameRole(
  items: { role: 'user' | 'assistant'; text: string }[]
): { role: 'user' | 'assistant'; text: string }[] {
  const out: { role: 'user' | 'assistant'; text: string }[] = []
  for (const item of items) {
    const prev = out[out.length - 1]
    if (prev && prev.role === item.role) {
      prev.text = `${prev.text}\n\n${item.text}`
    } else {
      out.push({ ...item })
    }
  }
  return out
}

export function taskAiChatFeedToCompletionMessages(
  messages: TaskAiChatFeedMsg[]
): { role: 'user' | 'assistant'; content: { type: 'text'; text: string }[] }[] {
  const sorted = [...messages].sort((a, b) => taskAiChatMsgTime(a) - taskAiChatMsgTime(b))
  const raw: { role: 'user' | 'assistant'; text: string }[] = []
  for (const m of sorted) {
    const text = (m.text ?? '').trim()
    if (!text) continue
    const role = m.data?.assistant ? ('assistant' as const) : ('user' as const)
    raw.push({ role, text })
  }
  const merged = mergeAdjacentSameRole(raw)
  return merged.map((m) => ({
    role: m.role,
    content: [{ type: 'text' as const, text: m.text }]
  }))
}

export async function appendTaskAiChatAssistantMessage(ctx: app.Ctx, feedId: string, userId: string, text: string) {
  const t = text.trim() || 'Пустой ответ.'
  await createFeedMessage(ctx, feedId, userId, {
    text: t,
    data: { assistant: true }
  })
}
