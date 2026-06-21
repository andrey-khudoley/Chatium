import { requireAccountRole } from '@app/auth'
import { createFeed, getChat, getOrCreateParticipant } from '@app/feed'
import { sendDataToSocket, genSocketId } from '@app/socket'
import { tryRunWithExclusiveLock } from '@app/sync'
import { reporterApp } from '../shared/error-handler-middleware'
import { ScheduleStatus, ScenarioEventType, FormSubmitAction } from '../shared/enum'
import AutowebinarSchedules from '../tables/autowebinar_schedules.table'
import Autowebinars from '../tables/autowebinars.table'
import ScenarioEvents from '../tables/scenario_events.table'
import EpisodeForms from '../tables/episode_forms.table'
import FormSubmissions from '../tables/form_submissions.table'
import {
  episodeChatMessagesGetRoute,
  episodeChatMessagesAddRoute,
  episodeChatMessagesChangesRoute
} from './chat'
import { s } from '@app/schema'
import { validateAndFixAutowebinarPlayer } from './kinescope-player'
import { extractKinescopeVideoId } from './autowebinars'

// ========== MINIMAL SCHEDULED AUTOWEBINAR JOBS (for analytics/status) ==========

// Job 1: Pre-start — transitions to waiting_room, schedules start job
const awPreStartJob = app.job('/aw-pre-start', async (ctx, params: { scheduleId: string }) => {
  const schedule = await AutowebinarSchedules.findById(ctx, params.scheduleId)
  if (!schedule || schedule.status !== ScheduleStatus.Scheduled) return

  if (!schedule.autowebinar) return
  const aw = await Autowebinars.findById(ctx, schedule.autowebinar.id)
  if (!aw) return

  await AutowebinarSchedules.update(ctx, {
    id: params.scheduleId,
    status: ScheduleStatus.WaitingRoom
  })

  const socketId = `autowebinar_${aw.id}`
  try {
    await sendDataToSocket(ctx, socketId, {
      type: 'schedule_updated',
      scheduleId: params.scheduleId,
      status: ScheduleStatus.WaitingRoom
    })
  } catch (e) {}

  // Schedule the stream start after waitingRoomDuration
  const waitingRoomDuration = aw.waitingRoomDuration || 0
  if (waitingRoomDuration > 0) {
    await awStartJob.scheduleJobAfter(ctx, waitingRoomDuration, 'seconds', {
      scheduleId: params.scheduleId
    })
  } else {
    await awStartJob.scheduleJobAsap(ctx, { scheduleId: params.scheduleId })
  }
})

// Job 2: Start — transitions to live, schedules finish
const awStartJob = app.job('/aw-start', async (ctx, params: { scheduleId: string }) => {
  const schedule = await AutowebinarSchedules.findById(ctx, params.scheduleId)
  if (!schedule || schedule.status !== ScheduleStatus.WaitingRoom) return

  if (!schedule.autowebinar) return
  const aw = await Autowebinars.findById(ctx, schedule.autowebinar.id)
  if (!aw) return

  const startedAt = new Date()

  await AutowebinarSchedules.update(ctx, {
    id: params.scheduleId,
    status: ScheduleStatus.Live,
    startedAt
  })

  const socketId = `autowebinar_${aw.id}`
  try {
    await sendDataToSocket(ctx, socketId, {
      type: 'schedule_updated',
      scheduleId: params.scheduleId,
      status: ScheduleStatus.Live,
      startedAt: startedAt.toISOString()
    })
  } catch (e) {}

  // Schedule finish
  await awFinishJob.scheduleJobAfter(ctx, aw.duration, 'seconds', {
    scheduleId: params.scheduleId
  })
})

// Job 3: Finish — transitions to finished
const awFinishJob = app.job('/aw-finish', async (ctx, params: { scheduleId: string }) => {
  const schedule = await AutowebinarSchedules.findById(ctx, params.scheduleId)
  if (!schedule || schedule.status !== ScheduleStatus.Live) return

  const aw = await Autowebinars.findById(ctx, schedule.autowebinar.id)
  if (!aw) return

  await AutowebinarSchedules.update(ctx, {
    id: params.scheduleId,
    status: ScheduleStatus.Finished,
    finishedAt: new Date()
  })

  const socketId = `autowebinar_${aw.id}`
  try {
    await sendDataToSocket(ctx, socketId, {
      type: 'schedule_updated',
      scheduleId: params.scheduleId,
      status: ScheduleStatus.Finished
    })
  } catch (e) {}
})

// ========== API: Get autowebinar data for viewer ==========

// @shared-route
export const apiAutowebinarViewerDataRoute = reporterApp.get(
  '/viewer-data/:id',
  async (ctx, req) => {
    const aw = await Autowebinars.findById(ctx, req.params.id as string)
    if (!aw) throw new Error('Автовебинар не найден')

    // Validate and fix player ID BEFORE sending response
    try {
      const validPlayerId = await validateAndFixAutowebinarPlayer(ctx, aw)
      if (validPlayerId !== aw.kinescopePlayerId) {
        await Autowebinars.update(ctx, {
          id: aw.id,
          kinescopePlayerId: validPlayerId
        })
        // Update in-memory object so client gets correct ID
        aw.kinescopePlayerId = validPlayerId

        ctx.account.log('@webinar-room Updated player ID for autowebinar', {
          level: 'info',
          json: { awId: aw.id, playerId: validPlayerId }
        })
      }
    } catch (e: any) {
      ctx.account.log('@webinar-room Failed to validate/update player', {
        level: 'warn',
        json: { awId: aw.id, error: e.message }
      })
    }

    // Приоритет: сохраненный kinescopeVideoId, затем динамическое извлечение из videoHash.
    let kinescopeVideoId: string | null = aw.kinescopeVideoId || null
    if (!kinescopeVideoId && aw.videoHash) {
      kinescopeVideoId = await extractKinescopeVideoId(ctx, aw.videoHash)
    }
    const awWithVideoId = { ...aw, kinescopeVideoId }

    // Check if user has preferred scheduleId from query (localStorage)
    const preferredScheduleId = req.query.scheduleId as string | undefined

    if (preferredScheduleId) {
      // Try to return preferred schedule if it's still valid (not finished more than 24h ago)
      const preferredSchedule = await AutowebinarSchedules.findById(ctx, preferredScheduleId)
      if (preferredSchedule && preferredSchedule.autowebinar?.id === aw.id) {
        // Check if schedule is still valid (not finished or finished less than 24h ago)
        const isValid =
          preferredSchedule.status !== ScheduleStatus.Finished ||
          (preferredSchedule.finishedAt &&
            Date.now() - new Date(preferredSchedule.finishedAt).getTime() < 24 * 60 * 60 * 1000)

        if (isValid) {
          return {
            autowebinar: awWithVideoId,
            schedule: preferredSchedule
          }
        }
      }
    }

    // First try to find an active schedule (live or waiting_room), take latest
    const activeSchedules = await AutowebinarSchedules.findAll(ctx, {
      where: {
        autowebinar: aw.id,
        status: [ScheduleStatus.Live, ScheduleStatus.WaitingRoom]
      },
      order: [{ scheduledDate: 'desc' }],
      limit: 1
    })

    if (activeSchedules.length > 0) {
      return {
        autowebinar: awWithVideoId,
        schedule: activeSchedules[0]
      }
    }

    const upcoming = await AutowebinarSchedules.findAll(ctx, {
      where: {
        autowebinar: aw.id,
        status: ScheduleStatus.Scheduled,
        scheduledDate: { $gte: new Date() }
      },
      order: [{ scheduledDate: 'asc' }],
      limit: 1
    })

    if (upcoming.length === 0) {
      const lastFinished = await AutowebinarSchedules.findAll(ctx, {
        where: {
          autowebinar: aw.id,
          status: ScheduleStatus.Finished
        },
        order: [{ finishedAt: 'desc' }],
        limit: 1
      })

      return {
        autowebinar: awWithVideoId,
        schedule: lastFinished[0] || null
      }
    }

    return {
      autowebinar: awWithVideoId,
      schedule: upcoming[0]
    }
  }
)

// API: Lazy chat creation for scheduled autowebinar
// Chat is created on first real viewer message (not on pre-start)
// @shared-route
export const apiAutowebinarChatRoute = reporterApp.get('/chat/:scheduleId', async (ctx, req) => {
  const schedule = await AutowebinarSchedules.findById(ctx, req.params.scheduleId as string)
  if (!schedule) throw new Error('Запуск не найден')

  const aw = await Autowebinars.findById(ctx, schedule.autowebinar.id)
  if (!aw) throw new Error('Автовебинар не найден')

  // Lazy creation: create chatFeed if it doesn't exist yet
  let chatFeedId = schedule.chatFeedId
  if (!chatFeedId) {
    const lockResult = await tryRunWithExclusiveLock(
      ctx,
      `lock:autowebinar:schedule:${schedule.id}:chat-feed`,
      15000,
      async (lockCtx) => {
        const freshSchedule = await AutowebinarSchedules.findById(lockCtx, schedule.id)
        if (!freshSchedule) {
          throw new Error('Запуск не найден')
        }

        if (freshSchedule.chatFeedId) {
          return freshSchedule.chatFeedId
        }

        const chatFeed = await createFeed(lockCtx, {
          title: `AW Chat: ${aw.title} (${schedule.id})`,
          inboxSubjectId: `autowebinar_schedule:${schedule.id}`,
          inboxExtraData: { autowebinarId: aw.id, scheduleId: schedule.id }
        })

        await AutowebinarSchedules.update(lockCtx, {
          id: schedule.id,
          chatFeedId: chatFeed.id
        })

        return chatFeed.id
      }
    )

    if (!lockResult.success || !lockResult.result) {
      throw new Error('Не удалось инициализировать чат автовебинара')
    }

    chatFeedId = lockResult.result
  }

  await getOrCreateParticipant(ctx, chatFeedId, ctx.user?.id as string, {
    muted: true,
    silent: true,
    inboxDisabled: true
  })

  const chat = await getChat(ctx, chatFeedId, {
    messagesGetUrl: episodeChatMessagesGetRoute({ feedId: chatFeedId }).url(),
    messagesAddUrl: episodeChatMessagesAddRoute({ feedId: chatFeedId }).url(),
    messagesChangesUrl: episodeChatMessagesChangesRoute({ feedId: chatFeedId }).url()
  })

  return { chat: { ...chat, scheduleId: schedule.id, episodeId: aw.id } }
})

// API: Get socket for autowebinar
// @shared-route
export const apiAutowebinarSocketRoute = reporterApp.get(
  '/socket/:autowebinarId',
  async (ctx, req) => {
    const socketId = `autowebinar_${req.params.autowebinarId}`
    const encodedSocketId = await genSocketId(ctx, socketId)
    return { encodedSocketId }
  }
)

// API: Get user socket for autowebinar
// @shared-route
export const apiAutowebinarUserSocketRoute = reporterApp.get(
  '/user-socket/:autowebinarId',
  async (ctx, req) => {
    if (!ctx.user) return { encodedSocketId: null }
    const socketId = `autowebinar_${req.params.autowebinarId}_user_${ctx.user.id}`
    const encodedSocketId = await genSocketId(ctx, socketId)
    return { encodedSocketId }
  }
)

// API: Get fake online count (works for both scheduled and on-demand)
// @shared-route
export const apiAutowebinarOnlineCountRoute = reporterApp.get(
  '/online-count/:autowebinarId',
  async (ctx, req) => {
    const aw = await Autowebinars.findById(ctx, req.params.autowebinarId as string)
    if (!aw) return { onlineCount: 0 }

    // Determine currentMinute from query param (client sends it) or from schedule
    let currentMinute = 0
    if (req.query.currentMinute) {
      currentMinute = parseInt(req.query.currentMinute as string, 10) || 0
    } else {
      const schedule = await AutowebinarSchedules.findOneBy(ctx, {
        autowebinar: aw.id,
        status: 'live'
      })
      if (schedule?.startedAt) {
        currentMinute = Math.floor((Date.now() - new Date(schedule.startedAt).getTime()) / 60000)
      }
    }

    const config: Array<{ minute: number; count: number }> = aw.fakeOnlineConfig || [
      { minute: 0, count: 50 },
      { minute: Math.floor((aw.duration || 60) / 2 / 60), count: 100 },
      { minute: Math.floor((aw.duration || 60) / 60), count: 80 }
    ]

    const sortedConfig = [...config].sort((a, b) => a.minute - b.minute)

    let onlineCount = sortedConfig[0]?.count || 50

    for (let i = 0; i < sortedConfig.length - 1; i++) {
      const p1 = sortedConfig[i]
      const p2 = sortedConfig[i + 1]

      if (currentMinute >= p1.minute && currentMinute <= p2.minute) {
        const t = (currentMinute - p1.minute) / (p2.minute - p1.minute)
        onlineCount = Math.round(p1.count + (p2.count - p1.count) * t)
        break
      } else if (currentMinute > p2.minute) {
        onlineCount = p2.count
      }
    }

    const variation = Math.round(onlineCount * 0.03 * (Math.random() * 2 - 1))
    onlineCount = Math.max(0, onlineCount + variation)

    return { onlineCount }
  }
)

// Общие вспомогательные функции для сценария
async function getScenarioMeta(ctx: any, awId: string) {
  const [streamStartEvent, wrStartEvent] = await Promise.all([
    ScenarioEvents.findOneBy(ctx, { autowebinar: awId, eventType: ScenarioEventType.StreamStart }),
    ScenarioEvents.findOneBy(ctx, {
      autowebinar: awId,
      eventType: ScenarioEventType.WaitingRoomStart
    })
  ])
  return {
    streamStartOffset: streamStartEvent?.offsetSeconds || 0,
    wrStartOffset: wrStartEvent?.offsetSeconds || 0
  }
}

async function getPaidFormIds(ctx: any): Promise<Set<string>> {
  const paidFormIds = new Set<string>()
  if (ctx.user) {
    const paidSubmissions = await FormSubmissions.findAll(ctx, {
      where: { user: ctx.user.id, paymentId: { $not: null } },
      limit: 200
    })
    for (const sub of paidSubmissions) {
      if (sub.form?.id) paidFormIds.add(sub.form.id)
    }
  }
  return paidFormIds
}

function filterCTAByPaid(
  events: any[],
  paidFormIds: Set<string>,
  resolvedFormIdForBanners: string | null
) {
  if (paidFormIds.size === 0) return events
  return events.filter((evt) => {
    const evtFormId = evt.formId?.id
    if (
      evt.eventType === ScenarioEventType.ShowForm ||
      evt.eventType === ScenarioEventType.HideForm
    ) {
      return !evtFormId || !paidFormIds.has(evtFormId)
    }
    if (evt.eventType === ScenarioEventType.SaleBanner) {
      const bannerFormId = evt.bannerData?.formId || resolvedFormIdForBanners
      return !bannerFormId || !paidFormIds.has(bannerFormId)
    }
    return true
  })
}

async function resolveFormIdForBanners(ctx: any, events: any[]): Promise<string | null> {
  const hasBannerWithoutFormId = events.some(
    (evt) =>
      evt.eventType === ScenarioEventType.SaleBanner && evt.bannerData && !evt.bannerData.formId
  )

  if (!hasBannerWithoutFormId) return null

  const paymentForms = await EpisodeForms.findAll(ctx, {
    where: { submitAction: FormSubmitAction.Payment },
    limit: 1,
    order: [{ sortOrder: 'asc' }]
  })

  return paymentForms.length > 0 ? paymentForms[0]?.id : null
}

function mapEvents(
  events: any[],
  streamStartOffset: number,
  wrStartOffset: number,
  resolvedFormIdForBanners: string | null
) {
  return events.map((evt) => {
    let bannerData = evt.bannerData
    if (
      evt.eventType === ScenarioEventType.SaleBanner &&
      bannerData &&
      !bannerData.formId &&
      resolvedFormIdForBanners
    ) {
      bannerData = { ...bannerData, formId: resolvedFormIdForBanners }
    }
    return {
      id: evt.id,
      scenarioEventId: evt.id,
      isScenarioMessage:
        evt.eventType === ScenarioEventType.ChatMessage ||
        evt.eventType === ScenarioEventType.SaleBanner,
      offsetSeconds: Math.max(0, evt.offsetSeconds - streamStartOffset),
      rawOffsetSeconds: evt.offsetSeconds,
      wrOffsetSeconds: Math.max(0, evt.offsetSeconds - wrStartOffset),
      eventType: evt.eventType,
      formId: evt.formId?.id,
      formSnapshot: evt.formSnapshot,
      chatMessage: evt.chatMessage,
      bannerData,
      reactionData: evt.reactionData
    }
  })
}

// API: Get scenario events for client-side rendering
// mode=past — прошедшие события (без reaction), все сразу
// mode=future (default) — будущие события с пагинацией
// @shared-route
export const apiAutowebinarScenarioRoute = reporterApp.get(
  '/scenario/:autowebinarId',
  async (ctx, req) => {
    const aw = await Autowebinars.findById(ctx, req.params.autowebinarId as string)
    if (!aw) throw new Error('Автовебинар не найден')

    const mode = (ctx.req.query.mode as string) || 'future'
    const elapsedSeconds = parseInt(ctx.req.query.elapsedSeconds as string) || 0
    const offset = parseInt(ctx.req.query.offset as string) || 0

    const [{ streamStartOffset, wrStartOffset }, paidFormIds] = await Promise.all([
      getScenarioMeta(ctx, aw.id),
      getPaidFormIds(ctx)
    ])

    const absoluteCutoff = streamStartOffset + elapsedSeconds

    if (mode === 'past') {
      // Прошедшие события: offsetSeconds <= cutoff, БЕЗ реакций, все сразу (без пагинации)
      const pastEventTypes = [
        ScenarioEventType.ShowForm,
        ScenarioEventType.HideForm,
        ScenarioEventType.SaleBanner,
        ScenarioEventType.ChatMessage
      ]
      const events = await ScenarioEvents.findAll(ctx, {
        where: {
          autowebinar: aw.id,
          eventType: pastEventTypes,
          offsetSeconds: { $lte: absoluteCutoff }
        },
        order: [{ offsetSeconds: 'asc' }, { sortOrder: 'asc' }],
        limit: 1000
      })

      const resolvedBannerFormId = await resolveFormIdForBanners(ctx, events)
      const filtered = filterCTAByPaid(events, paidFormIds, resolvedBannerFormId)

      return {
        events: mapEvents(filtered, streamStartOffset, wrStartOffset, resolvedBannerFormId),
        duration: aw.duration,
        waitingRoomDuration: aw.waitingRoomDuration || 0,
        streamStartOffset,
        wrStartOffset,
        nextOffset: 0,
        hasMore: false
      }
    }

    // mode=future — будущие события: offsetSeconds > cutoff, ВСЕ типы, с пагинацией
    const futureEventTypes = [
      ScenarioEventType.ShowForm,
      ScenarioEventType.HideForm,
      ScenarioEventType.SaleBanner,
      ScenarioEventType.ChatMessage,
      ScenarioEventType.Reaction
    ]
    const events = await ScenarioEvents.findAll(ctx, {
      where: {
        autowebinar: aw.id,
        eventType: futureEventTypes,
        offsetSeconds: { $gt: absoluteCutoff }
      },
      order: [{ offsetSeconds: 'asc' }, { sortOrder: 'asc' }],
      limit: 1000,
      offset
    })

    const resolvedBannerFormId = await resolveFormIdForBanners(ctx, events)
    const filtered = filterCTAByPaid(events, paidFormIds, resolvedBannerFormId)

    const nextOffset = offset + events.length
    const hasMore = events.length >= 1000

    return {
      events: mapEvents(filtered, streamStartOffset, wrStartOffset, resolvedBannerFormId),
      duration: aw.duration,
      waitingRoomDuration: aw.waitingRoomDuration || 0,
      streamStartOffset,
      wrStartOffset,
      nextOffset,
      hasMore
    }
  }
)

// API: Manually trigger schedule start (for admin)
// @shared-route
export const apiAutowebinarManualStartRoute = reporterApp
  .body((s) => ({
    scheduleId: s.string()
  }))
  .post('/manual-start', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const schedule = await AutowebinarSchedules.findById(ctx, req.body.scheduleId)
    if (!schedule) throw new Error('Запуск не найден')

    if (schedule.status === ScheduleStatus.Scheduled) {
      awPreStartJob.scheduleJobAsap(ctx, { scheduleId: req.body.scheduleId })
    }

    return { success: true }
  })

export { awPreStartJob, awStartJob, awFinishJob }
