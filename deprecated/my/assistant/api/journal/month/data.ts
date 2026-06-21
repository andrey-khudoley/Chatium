// @shared-route
import { requireRealUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as tasksRepo from '../../../repos/tasks.repo'
import * as pomodoroLaunchesRepo from '../../../repos/pomodoro-launches.repo'

const LOG_PATH = 'api/journal/month/data'

export const getJournalMonthDataRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const year = parseInt(String(req.query.year), 10)
  const month = parseInt(String(req.query.month), 10)

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return { success: false, error: 'Некорректные параметры year/month' }
  }

  try {
    const [completedTasks, focusByDay] = await Promise.all([
      tasksRepo.getCompletedTasksSummaryForMonth(ctx, user.id, year, month),
      pomodoroLaunchesRepo.getWorkFocusByDayForMonth(ctx, user.id, year, month)
    ])
    return { success: true, year, month, completedTasks, focusByDay }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка загрузки данных месяца`,
      payload: { error: String(error), year, month }
    })
    return { success: false, error: String(error) }
  }
})
