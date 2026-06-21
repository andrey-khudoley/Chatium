import { requireAccountRole } from '@app/auth'
import { s } from '@app/schema'
import { reporterApp } from '../shared/error-handler-middleware'
import { ScheduleStatus } from '../shared/enum'
import AutowebinarSchedules from '../tables/autowebinar_schedules.table'
import Autowebinars from '../tables/autowebinars.table'
import { awPreStartJob } from './autowebinar-engine'

// @shared-route
export const apiSchedulesListRoute = reporterApp.get('/list', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const autowebinarId = req.query.autowebinarId as string
  if (!autowebinarId) throw new Error('autowebinarId обязателен')

  const where: any = { autowebinar: autowebinarId }
  if (req.query.status) where.status = req.query.status

  const schedules = await AutowebinarSchedules.findAll(ctx, {
    where,
    order: [{ scheduledDate: 'asc' }],
    limit: 100
  })

  return schedules
})

// @shared-route
export const apiScheduleByIdRoute = reporterApp.get('/by-id/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const schedule = await AutowebinarSchedules.findById(ctx, req.params.id as string)
  if (!schedule) throw new Error('Запуск не найден')

  return schedule
})

// @shared-route
export const apiScheduleCreateRoute = reporterApp
  .body((s) => ({
    autowebinarId: s.string(),
    scheduledDate: s.date()
  }))
  .post('/create', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const aw = await Autowebinars.findById(ctx, req.body.autowebinarId)
    if (!aw) throw new Error('Автовебинар не найден')

    const scheduledDate = new Date(req.body.scheduledDate)

    const schedule = await AutowebinarSchedules.create(ctx, {
      autowebinar: req.body.autowebinarId,
      scheduledDate,
      status: ScheduleStatus.Scheduled
    })

    // Schedule the pre-start job at scheduledDate
    await awPreStartJob.scheduleJobAt(ctx, scheduledDate, { scheduleId: schedule.id })

    return schedule
  })

// @shared-route
export const apiScheduleCreateNowRoute = reporterApp
  .body((s) => ({
    autowebinarId: s.string()
  }))
  .post('/create-now', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const aw = await Autowebinars.findById(ctx, req.body.autowebinarId)
    if (!aw) throw new Error('Автовебинар не найден')

    const schedule = await AutowebinarSchedules.create(ctx, {
      autowebinar: req.body.autowebinarId,
      scheduledDate: new Date(),
      status: ScheduleStatus.Scheduled
    })

    await awPreStartJob.scheduleJobAsap(ctx, { scheduleId: schedule.id })

    return schedule
  })

// @shared-route
export const apiScheduleDeleteRoute = reporterApp.post('/delete/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const schedule = await AutowebinarSchedules.findById(ctx, req.params.id as string)
  if (!schedule) throw new Error('Запуск не найден')

  if (schedule.status === ScheduleStatus.Live) {
    throw new Error('Нельзя удалить запущенный автовебинар')
  }

  await AutowebinarSchedules.delete(ctx, req.params.id as string)

  return { success: true }
})

// Получить ближайший/текущий запуск для конкретного автовеба
// @shared-route
export const apiScheduleCurrentRoute = reporterApp.get(
  '/current/:autowebinarId',
  async (ctx, req) => {
    const autowebinarId = req.params.autowebinarId as string

    // Сначала ищем активные (live или waiting_room), берём самый свежий
    const activeSchedules = await AutowebinarSchedules.findAll(ctx, {
      where: {
        autowebinar: autowebinarId,
        status: [ScheduleStatus.Live, ScheduleStatus.WaitingRoom]
      },
      order: [{ scheduledDate: 'desc' }],
      limit: 1
    })

    if (activeSchedules.length > 0) return activeSchedules[0]

    // Иначе ближайший запланированный в будущем
    const upcoming = await AutowebinarSchedules.findAll(ctx, {
      where: {
        autowebinar: autowebinarId,
        status: ScheduleStatus.Scheduled,
        scheduledDate: { $gte: new Date() }
      },
      order: [{ scheduledDate: 'asc' }],
      limit: 1
    })

    return upcoming[0] || null
  }
)

// Массовое создание расписаний с интервалом
// @shared-route
export const apiScheduleBulkCreateRoute = reporterApp
  .body((s) => ({
    autowebinarId: s.string(),
    startDate: s.date(),
    endDate: s.date(),
    intervalMinutes: s.number()
  }))
  .post('/bulk-create', async (ctx, req) => {
    const MAX_BULK_SCHEDULES = 360

    requireAccountRole(ctx, 'Admin')

    const aw = await Autowebinars.findById(ctx, req.body.autowebinarId)
    if (!aw) throw new Error('Автовебинар не найден')

    const startDate = new Date(req.body.startDate)
    const endDate = new Date(req.body.endDate)
    const intervalMs = req.body.intervalMinutes * 60 * 1000

    if (startDate >= endDate) {
      throw new Error('Дата начала должна быть раньше даты окончания')
    }

    if (![15, 30, 45, 60].includes(req.body.intervalMinutes)) {
      throw new Error('Интервал должен быть 15, 30, 45 или 60 минут')
    }

    const estimatedCount = Math.floor((endDate.getTime() - startDate.getTime()) / intervalMs) + 1
    if (estimatedCount > MAX_BULK_SCHEDULES) {
      throw new Error(`За один раз можно запланировать не более ${MAX_BULK_SCHEDULES} запусков`)
    }

    const schedules = []
    let currentDate = new Date(startDate.getTime())

    while (currentDate <= endDate) {
      const schedule = await AutowebinarSchedules.create(ctx, {
        autowebinar: req.body.autowebinarId,
        scheduledDate: new Date(currentDate),
        status: ScheduleStatus.Scheduled
      })

      // Schedule the pre-start job at scheduledDate
      await awPreStartJob.scheduleJobAt(ctx, new Date(currentDate), { scheduleId: schedule.id })

      schedules.push(schedule)
      currentDate = new Date(currentDate.getTime() + intervalMs)
    }

    return { created: schedules.length, schedules }
  })
