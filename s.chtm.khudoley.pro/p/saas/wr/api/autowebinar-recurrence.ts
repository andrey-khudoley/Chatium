import AutowebinarSchedules from '../tables/autowebinar_schedules.table'
import Autowebinars from '../tables/autowebinars.table'
import { AutowebinarStatus, AutowebinarMode, ScheduleStatus } from '../shared/enum'
import { awPreStartJob } from './autowebinar-engine'

// Daily recurrence job — runs once a day to create scheduled autowebinar runs
const awRecurrenceJob = app.job('/aw-recurrence', async (ctx, params) => {
  // Find all active scheduled autowebinars with recurrence
  const autowebinars = await Autowebinars.findAll(ctx, {
    where: {
      status: AutowebinarStatus.Active,
      mode: AutowebinarMode.Scheduled
    },
    limit: 100
  })

  for (const aw of autowebinars) {
    if (!aw.recurrence) continue

    const recurrence = aw.recurrence as {
      type: string
      daysOfWeek: number[]
      time: string
      timezone: string
    }

    if (!recurrence.daysOfWeek || !recurrence.time) continue

    // Check upcoming 7 days
    const now = new Date()
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDate = new Date(now)
      checkDate.setDate(checkDate.getDate() + dayOffset)

      const dayOfWeek = checkDate.getDay()
      if (!recurrence.daysOfWeek.includes(dayOfWeek)) continue

      // Parse time HH:MM
      const [hours, minutes] = recurrence.time.split(':').map(Number)
      const scheduledDate = new Date(checkDate)
      scheduledDate.setHours(hours, minutes, 0, 0)

      // Skip if in the past
      if (scheduledDate.getTime() < now.getTime()) continue

      // Check if schedule already exists for this date
      const existing = await AutowebinarSchedules.findAll(ctx, {
        where: {
          autowebinar: aw.id,
          scheduledDate: {
            $gte: new Date(scheduledDate.getTime() - 60000),
            $lte: new Date(scheduledDate.getTime() + 60000)
          }
        },
        limit: 1
      })

      if (existing.length > 0) continue

      // Create schedule
      const schedule = await AutowebinarSchedules.create(ctx, {
        autowebinar: aw.id,
        scheduledDate,
        status: ScheduleStatus.Scheduled
      })

      // Schedule the pre-start job
      await awPreStartJob.scheduleJobAt(ctx, scheduledDate, { scheduleId: schedule.id })
    }
  }
})

// Self-scheduling: run daily at 00:05 UTC
const awRecurrenceBootstrap = app.job('/aw-recurrence-bootstrap', async (ctx, params) => {
  // Schedule recurrence job for tomorrow 00:05 UTC
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 5, 0, 0)

  awRecurrenceJob.scheduleJobAt(ctx, tomorrow, {})
  awRecurrenceBootstrap.scheduleJobAt(ctx, tomorrow, {})
})

export { awRecurrenceJob, awRecurrenceBootstrap }
