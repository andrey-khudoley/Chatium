import {
  deleteFromCustomJobQueue,
  pickFromCustomJobQueue,
  scheduleNextCustomJobQueueRunAfter
} from '@app/jobs'
import AutowebinarSchedules from '../tables/autowebinar_schedules.table'
import BulkScheduleTasks from '../tables/bulk_schedule_tasks.table'
import { ScheduleStatus } from '../shared/enum'
import { awPreStartJob } from './autowebinar-engine'

type BulkScheduleQueueTask = {
  bulkTaskId: string
  autowebinarId: string
  scheduledDate: string
}

async function markProgress(ctx: app.Ctx, bulkTaskId: string, ok: boolean, errorText?: string) {
  const task = await BulkScheduleTasks.findById(ctx, bulkTaskId)
  if (!task) return

  const processed = (task.processed || 0) + 1
  const created = (task.created || 0) + (ok ? 1 : 0)
  const failed = (task.failed || 0) + (ok ? 0 : 1)
  const total = task.total || 0
  const done = processed >= total

  let status = task.status || 'processing'
  if (done) {
    status = failed > 0 && created === 0 ? 'failed' : 'completed'
  }

  await BulkScheduleTasks.update(ctx, {
    id: task.id,
    processed,
    created,
    failed,
    status,
    error: errorText || task.error || undefined,
    finishedAt: done ? new Date() : task.finishedAt
  })
}

export const schedulesBulkWorker = app.job('/', async (ctx, params: { queueName: string }) => {
  const queueName = params.queueName
  const task = await pickFromCustomJobQueue(ctx, queueName, 1).then((r) => r[0])
  if (!task) return

  const queueTaskId = task[0]
  const payload = task[1] as BulkScheduleQueueTask

  try {
    const scheduledDate = new Date(payload.scheduledDate)

    const schedule = await AutowebinarSchedules.create(ctx, {
      autowebinar: payload.autowebinarId,
      scheduledDate,
      status: ScheduleStatus.Scheduled
    })

    await awPreStartJob.scheduleJobAt(ctx, scheduledDate, { scheduleId: schedule.id })
    await markProgress(ctx, payload.bulkTaskId, true)
  } catch (error) {
    await markProgress(
      ctx,
      payload.bulkTaskId,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    )
  } finally {
    await deleteFromCustomJobQueue(ctx, queueName, queueTaskId)
    await scheduleNextCustomJobQueueRunAfter(ctx, queueName, 0, 'seconds')
  }
})
