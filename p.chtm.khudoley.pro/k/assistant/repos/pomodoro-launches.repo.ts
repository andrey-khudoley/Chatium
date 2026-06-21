import PomodoroLaunches from '../tables/pomodoro-launches.table'
import type { PomodoroStateDto } from '../lib/pomodoro-types'
import type { PomodoroLaunchEndReason, PomodoroLaunchSource } from '../tables/pomodoro-launches.table'

type StartLaunchInput = {
  userId: string
  state: Pick<PomodoroStateDto, 'phase' | 'currentTaskId' | 'cyclesCompleted'>
  source: PomodoroLaunchSource
  startedAtMs: number
}

export async function findOpenLaunchByUser(ctx: app.Ctx, userId: string): Promise<typeof PomodoroLaunches.T | null> {
  const rows = await PomodoroLaunches.findAll(ctx, {
    where: { userId, endedAtMs: null },
    order: [{ startedAtMs: 'desc' }],
    limit: 1
  })
  return rows[0] ?? null
}

export async function startLaunch(ctx: app.Ctx, input: StartLaunchInput): Promise<typeof PomodoroLaunches.T> {
  return PomodoroLaunches.create(ctx, {
    userId: input.userId,
    startedAtMs: input.startedAtMs,
    phase: input.state.phase,
    taskId: input.state.currentTaskId || null,
    cyclesCompletedAtStart: Math.max(0, Math.floor(input.state.cyclesCompleted)),
    source: input.source
  })
}

export async function closeLaunch(
  ctx: app.Ctx,
  launchId: string,
  endedAtMs: number,
  endReason: PomodoroLaunchEndReason
): Promise<typeof PomodoroLaunches.T> {
  const launch = await PomodoroLaunches.findById(ctx, launchId)
  if (!launch) throw new Error('Pomodoro launch not found')
  if (launch.endedAtMs) return launch
  const safeEndedAt = Math.max(launch.startedAtMs, Math.floor(endedAtMs))
  const durationSec = Math.max(0, Math.floor((safeEndedAt - launch.startedAtMs) / 1000))
  return PomodoroLaunches.update(ctx, {
    id: launch.id,
    endedAtMs: safeEndedAt,
    durationSec,
    endReason
  })
}

export async function closeOpenLaunchByUser(
  ctx: app.Ctx,
  userId: string,
  endedAtMs: number,
  endReason: PomodoroLaunchEndReason
): Promise<typeof PomodoroLaunches.T | null> {
  const openLaunch = await findOpenLaunchByUser(ctx, userId)
  if (!openLaunch) return null
  return closeLaunch(ctx, openLaunch.id, endedAtMs, endReason)
}

type AppendFocusLaunchInput = {
  userId: string
  startedAtMs: number
  endedAtMs: number
  source: Extract<PomodoroLaunchSource, 'tools_timer' | 'tools_stopwatch'>
  taskId?: string | null
}

export async function appendFocusLaunchSegment(ctx: app.Ctx, input: AppendFocusLaunchInput): Promise<typeof PomodoroLaunches.T> {
  const startedAtMs = Math.max(0, Math.floor(input.startedAtMs))
  const endedAtMs = Math.max(startedAtMs, Math.floor(input.endedAtMs))
  const durationSec = Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1000))
  return PomodoroLaunches.create(ctx, {
    userId: input.userId,
    startedAtMs,
    endedAtMs,
    durationSec,
    phase: 'work',
    taskId: input.taskId ?? null,
    cyclesCompletedAtStart: 0,
    source: input.source,
    endReason: 'stop'
  })
}

function msToDayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function getWorkFocusByDayForMonth(
  ctx: app.Ctx,
  userId: string,
  year: number,
  month: number
): Promise<Record<string, number>> {
  const monthStartMs = new Date(year, month - 1, 1).getTime()
  const monthEndMs = new Date(year, month, 1).getTime()

  const launches = await PomodoroLaunches.findAll(ctx, { where: { userId, phase: 'work' } })

  const focusByDay: Record<string, number> = {}
  for (const launch of launches) {
    if (!launch.endedAtMs || !launch.durationSec) continue
    if (launch.startedAtMs >= monthStartMs && launch.startedAtMs < monthEndMs) {
      const key = msToDayKey(launch.startedAtMs)
      focusByDay[key] = (focusByDay[key] ?? 0) + (launch.durationSec ?? 0)
    }
  }
  return focusByDay
}
