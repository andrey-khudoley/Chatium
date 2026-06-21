import { requireAccountRole } from '@app/auth'
import { s } from '@app/schema'
import { formStorage } from '@app/form-storage'
import { reporterApp } from '../shared/error-handler-middleware'
import Autowebinars from '../tables/autowebinars.table'
import AutowebinarSchedules from '../tables/autowebinar_schedules.table'
import ScenarioEvents from '../tables/scenario_events.table'
import { ScenarioEventType } from '../shared/enum'

// API: Debug seek — shift startedAt for scheduled mode
// @shared-route
export const apiDebugSeekRoute = reporterApp
  .body((s) => ({
    autowebinarId: s.string(),
    shiftSeconds: s.number(),
    scheduleId: s.string().optional()
  }))
  .post('/seek', async (ctx, req) => {
    requireAccountRole(ctx, 'Staff')

    const aw = await Autowebinars.findById(ctx, req.body.autowebinarId)
    if (!aw) throw new Error('Автовебинар не найден')

    if (req.body.shiftSeconds < 0) throw new Error('Перемотка назад запрещена')

    const wrDuration = aw.waitingRoomDuration || 0
    let newOffset = 0

    // Find stream_start offset for normalization
    const streamStartEvent = await ScenarioEvents.findOneBy(ctx, {
      autowebinar: req.body.autowebinarId,
      eventType: ScenarioEventType.StreamStart
    })
    const streamStartOffset = streamStartEvent?.offsetSeconds || 0

    if (req.body.scheduleId) {
      // Scheduled mode: work with schedule.startedAt
      const schedule = await AutowebinarSchedules.findById(ctx, req.body.scheduleId)
      if (!schedule || !schedule.startedAt) throw new Error('Запуск не найден или не начат')

      const newStartedAt = new Date(schedule.startedAt.getTime() - req.body.shiftSeconds * 1000)
      await AutowebinarSchedules.update(ctx, {
        id: req.body.scheduleId,
        startedAt: newStartedAt
      })

      newOffset = Math.max(0, Math.round((Date.now() - newStartedAt.getTime()) / 1000))
    } else {
      throw new Error('Требуется scheduleId')
    }

    // Get nearby events with normalized offsets
    const events = await ScenarioEvents.findAll(ctx, {
      where: {
        autowebinar: req.body.autowebinarId,
        offsetSeconds: {
          $gte: Math.max(0, newOffset + streamStartOffset - 120),
          $lte: newOffset + streamStartOffset + 300
        }
      },
      order: [{ offsetSeconds: 'asc' }],
      limit: 50
    })

    return {
      newOffset,
      nearbyEvents: events.map((e) => ({
        id: e.id,
        offsetSeconds: Math.max(0, e.offsetSeconds - streamStartOffset),
        eventType: e.eventType,
        formId: e.formId?.id,
        chatMessage: e.chatMessage,
        reactionData: e.reactionData
      }))
    }
  })

// API: Debug pause/resume
// @shared-route
export const apiDebugPauseRoute = reporterApp
  .body((s) => ({
    autowebinarId: s.string(),
    paused: s.boolean()
  }))
  .post('/pause', async (ctx, req) => {
    requireAccountRole(ctx, 'Staff')

    const userId = ctx.user!.id
    const debugKey = `aw_debug:${req.body.autowebinarId}:${userId}`
    await formStorage.setItem(debugKey, { paused: req.body.paused, pausedAt: Date.now() })

    return { success: true, paused: req.body.paused }
  })

// API: Debug status — for scheduled mode
// @shared-route
export const apiDebugStatusRoute = reporterApp
  .query((s) => ({
    scheduleId: s.string().optional()
  }))
  .get('/status/:autowebinarId', async (ctx, req) => {
    requireAccountRole(ctx, 'Staff')

    const aw = await Autowebinars.findById(ctx, req.params.autowebinarId as string)
    if (!aw) return { active: false }

    const wrDuration = aw.waitingRoomDuration || 0
    let currentOffset = 0
    let status = ''

    // Find stream_start offset for normalization
    const streamStartEvent = await ScenarioEvents.findOneBy(ctx, {
      autowebinar: req.params.autowebinarId as string,
      eventType: ScenarioEventType.StreamStart
    })
    const streamStartOffset = streamStartEvent?.offsetSeconds || 0

    if (req.query.scheduleId) {
      // Scheduled mode
      const schedule = await AutowebinarSchedules.findById(ctx, req.query.scheduleId)
      if (!schedule || !schedule.startedAt) return { active: false }

      currentOffset = Math.max(0, Math.round((Date.now() - schedule.startedAt.getTime()) / 1000))
      status = schedule.status
    } else {
      return { active: false }
    }

    // Get nearby events with normalized offsets
    const events = await ScenarioEvents.findAll(ctx, {
      where: {
        autowebinar: req.params.autowebinarId as string,
        offsetSeconds: {
          $gte: Math.max(0, currentOffset + streamStartOffset - 120),
          $lte: currentOffset + streamStartOffset + 300
        }
      },
      order: [{ offsetSeconds: 'asc' }],
      limit: 50
    })

    return {
      active: true,
      currentOffset,
      duration: aw.duration,
      status,
      nearbyEvents: events.map((e) => ({
        id: e.id,
        offsetSeconds: Math.max(0, e.offsetSeconds - streamStartOffset),
        eventType: e.eventType,
        chatMessage: e.chatMessage,
        reactionData: e.reactionData
      }))
    }
  })
