// @ts-nocheck
import {
  deleteFromCustomJobQueue,
  pickFromCustomJobQueue,
  scheduleNextCustomJobQueueRunAfter
} from '@app/jobs'
import ScenarioEvents from '../tables/scenario_events.table'
import Autowebinars from '../tables/autowebinars.table'
import { ScenarioEventType } from '../shared/enum'

export type ScenarioImportTask = {
  autowebinarId: string
  event: {
    offsetSeconds: number
    eventType: ScenarioEventType
    formId?: string
    formSnapshot?: any
    chatMessage?: any
    bannerData?: any
    reactionData?: any
  }
}

const SYSTEM_EVENT_TYPES = new Set<ScenarioEventType>([
  ScenarioEventType.WaitingRoomStart,
  ScenarioEventType.StreamStart,
  ScenarioEventType.Finish
])

const ALLOWED_REACTIONS = new Set(['❤️', '🔥', '😂'])

function toFiniteNumber(value: any): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function toNonEmptyString(value: any): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeAndValidateEvent(event: any, duration: number) {
  const offsetSeconds = toFiniteNumber(event?.offsetSeconds)
  if (offsetSeconds === null || offsetSeconds < 0 || offsetSeconds > duration) {
    throw new Error(`Invalid offsetSeconds: ${event?.offsetSeconds}`)
  }

  const eventType = event?.eventType as ScenarioEventType
  const allowedEventTypes = new Set(Object.values(ScenarioEventType))
  if (!allowedEventTypes.has(eventType)) {
    throw new Error(`Invalid eventType: ${event?.eventType}`)
  }

  const normalized: ScenarioImportTask['event'] = {
    offsetSeconds,
    eventType,
    formId: null,
    formSnapshot: null,
    chatMessage: null,
    bannerData: null,
    reactionData: null
  }

  if (eventType === ScenarioEventType.ShowForm || eventType === ScenarioEventType.HideForm) {
    const formId = toNonEmptyString(event?.formId)
    if (!formId) throw new Error('formId is required for show_form/hide_form')
    normalized.formId = formId
  }

  if (eventType === ScenarioEventType.ChatMessage) {
    const authorName = toNonEmptyString(event?.chatMessage?.authorName)
    const text = toNonEmptyString(event?.chatMessage?.text)
    if (!authorName || !text)
      throw new Error('chatMessage.authorName and chatMessage.text are required for chat_message')

    normalized.chatMessage = {
      authorName,
      text,
      avatarUrl: toNonEmptyString(event?.chatMessage?.avatarUrl) || undefined
    }
  }

  if (eventType === ScenarioEventType.SaleBanner) {
    const title = toNonEmptyString(event?.bannerData?.title)
    const subtitle = toNonEmptyString(event?.bannerData?.subtitle)
    if (!title || !subtitle)
      throw new Error('bannerData.title and bannerData.subtitle are required for sale_banner')

    normalized.bannerData = {
      title,
      subtitle,
      buttonText: toNonEmptyString(event?.bannerData?.buttonText) || undefined,
      formId: toNonEmptyString(event?.bannerData?.formId) || undefined
    }
  }

  if (eventType === ScenarioEventType.Reaction) {
    const emoji = toNonEmptyString(event?.reactionData?.emoji)
    if (!emoji || !ALLOWED_REACTIONS.has(emoji)) {
      throw new Error(
        `reactionData.emoji must be one of: ${Array.from(ALLOWED_REACTIONS).join(', ')}`
      )
    }
    normalized.reactionData = { emoji }
  }

  return normalized
}

export const scenarioImportWorker = app.job('/', async (ctx, params: any) => {
  const QUEUE_NAME = params.queueName

  const task = await pickFromCustomJobQueue(ctx, QUEUE_NAME, 1).then((r) => r[0])

  if (!task) {
    ctx.account.log('[ScenarioImportWorker] No task in queue', { level: 'info' })
    return
  }

  const taskId = task[0]
  const taskData = task[1] as ScenarioImportTask

  ctx.account.log('[ScenarioImportWorker] Processing task', {
    level: 'info',
    json: { taskId, autowebinarId: taskData.autowebinarId, eventType: taskData.event.eventType }
  })

  try {
    const { autowebinarId, event } = taskData

    const aw = await Autowebinars.findById(ctx, autowebinarId)
    if (!aw) {
      throw new Error(`Autowebinar not found: ${autowebinarId}`)
    }

    const normalizedEvent = normalizeAndValidateEvent(event, aw.duration || 0)

    if (SYSTEM_EVENT_TYPES.has(normalizedEvent.eventType)) {
      const existingSystemEvent = await ScenarioEvents.findOneBy(ctx, {
        autowebinar: autowebinarId,
        eventType: normalizedEvent.eventType
      })
      if (existingSystemEvent) {
        ctx.account.log('[ScenarioImportWorker] Skip duplicate system event', {
          level: 'info',
          json: { taskId, autowebinarId, eventType: normalizedEvent.eventType }
        })
        await deleteFromCustomJobQueue(ctx, QUEUE_NAME, taskId)
        await scheduleNextCustomJobQueueRunAfter(ctx, QUEUE_NAME, 0, 'seconds')
        return
      }
    }

    // Создаём событие в таблице
    await ScenarioEvents.create(ctx, {
      autowebinar: autowebinarId,
      offsetSeconds: normalizedEvent.offsetSeconds,
      eventType: normalizedEvent.eventType,
      formId: normalizedEvent.formId || null,
      formSnapshot: normalizedEvent.formSnapshot || null,
      chatMessage: normalizedEvent.chatMessage || null,
      bannerData: normalizedEvent.bannerData || null,
      reactionData: normalizedEvent.reactionData || null,
      sortOrder: normalizedEvent.offsetSeconds
    })

    ctx.account.log('[ScenarioImportWorker] Event created', {
      level: 'info',
      json: {
        taskId,
        autowebinarId,
        eventType: normalizedEvent.eventType,
        offsetSeconds: normalizedEvent.offsetSeconds
      }
    })

    // Удаляем задачу из очереди
    await deleteFromCustomJobQueue(ctx, QUEUE_NAME, taskId)

    // Планируем следующий запуск воркера
    await scheduleNextCustomJobQueueRunAfter(ctx, QUEUE_NAME, 0, 'seconds')
  } catch (error) {
    ctx.account.log('[ScenarioImportWorker] Error processing task', {
      level: 'error',
      err: error as any,
      json: { taskId, taskData }
    })

    // В случае ошибки всё равно удаляем задачу, чтобы не блокировать очередь
    await deleteFromCustomJobQueue(ctx, QUEUE_NAME, taskId)
    await scheduleNextCustomJobQueueRunAfter(ctx, QUEUE_NAME, 0, 'seconds')
  }
})
