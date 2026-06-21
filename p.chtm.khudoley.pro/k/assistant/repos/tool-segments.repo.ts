import PomodoroLaunches from '../tables/pomodoro-launches.table'
import type { PomodoroStateDto } from '../lib/pomodoro-types'
import type { PomodoroLaunchEndReason, PomodoroLaunchSource } from '../tables/pomodoro-launches.table'
import type { SegmentToolKind } from '../shared/focus-tools-types'

export type StartSegmentInput = {
  userId: string
  state: Pick<PomodoroStateDto, 'phase' | 'currentTaskId' | 'cyclesCompleted'>
  source: PomodoroLaunchSource
  startedAtMs: number
  tool: SegmentToolKind
  runId: string
}

export async function findOpenSegmentByUser(ctx: app.Ctx, userId: string): Promise<typeof PomodoroLaunches.T | null> {
  const rows = await PomodoroLaunches.findAll(ctx, {
    where: { userId, endedAtMs: null },
    order: [{ startedAtMs: 'desc' }],
    limit: 1,
  })
  return rows[0] ?? null
}

function rowMatchesToolKind(row: typeof PomodoroLaunches.T, kind: SegmentToolKind | 'pomodoro'): boolean {
  if (kind === 'pomodoro') {
    if (row.tool === 'pomodoro') return true
    if (row.tool === 'timer' || row.tool === 'stopwatch') return false
    return row.source !== 'tools_timer' && row.source !== 'tools_stopwatch'
  }
  if (kind === 'timer') return row.tool === 'timer' || row.source === 'tools_timer'
  return row.tool === 'stopwatch' || row.source === 'tools_stopwatch'
}

export async function findOpenSegmentByUserAndTool(
  ctx: app.Ctx,
  userId: string,
  kind: SegmentToolKind | 'pomodoro',
): Promise<typeof PomodoroLaunches.T | null> {
  const rows = await PomodoroLaunches.findAll(ctx, {
    where: { userId, endedAtMs: null },
    order: [{ startedAtMs: 'desc' }],
    limit: 8,
  })
  return rows.find((r) => rowMatchesToolKind(r, kind)) ?? null
}

export async function startSegment(ctx: app.Ctx, input: StartSegmentInput): Promise<typeof PomodoroLaunches.T> {
  return PomodoroLaunches.create(ctx, {
    userId: input.userId,
    startedAtMs: input.startedAtMs,
    phase: input.state.phase,
    taskId: input.state.currentTaskId || null,
    cyclesCompletedAtStart: Math.max(0, Math.floor(input.state.cyclesCompleted)),
    source: input.source,
    tool: input.tool,
    runId: input.runId,
  })
}

export async function closeSegment(
  ctx: app.Ctx,
  segmentId: string,
  endedAtMs: number,
  endReason: PomodoroLaunchEndReason,
): Promise<typeof PomodoroLaunches.T> {
  const launch = await PomodoroLaunches.findById(ctx, segmentId)
  if (!launch) throw new Error('Tool segment not found')
  if (launch.endedAtMs) return launch
  const safeEndedAt = Math.max(launch.startedAtMs, Math.floor(endedAtMs))
  const durationSec = Math.max(0, Math.floor((safeEndedAt - launch.startedAtMs) / 1000))
  return PomodoroLaunches.update(ctx, {
    id: launch.id,
    endedAtMs: safeEndedAt,
    durationSec,
    endReason,
  })
}

export async function closeOpenSegmentByUser(
  ctx: app.Ctx,
  userId: string,
  endedAtMs: number,
  endReason: PomodoroLaunchEndReason,
): Promise<typeof PomodoroLaunches.T | null> {
  const open = await findOpenSegmentByUser(ctx, userId)
  if (!open) return null
  return closeSegment(ctx, open.id, endedAtMs, endReason)
}

export async function closeOpenSegmentByUserAndTool(
  ctx: app.Ctx,
  userId: string,
  kind: SegmentToolKind | 'pomodoro',
  endedAtMs: number,
  endReason: PomodoroLaunchEndReason,
): Promise<typeof PomodoroLaunches.T | null> {
  const open = await findOpenSegmentByUserAndTool(ctx, userId, kind)
  if (!open) return null
  return closeSegment(ctx, open.id, endedAtMs, endReason)
}

/** Закрытый сегмент целиком (например завершённый интервал таймера с клиентскими границами времени — не используем; сервер сам закрывает). */
export async function appendClosedSegment(ctx: app.Ctx, input: {
  userId: string
  startedAtMs: number
  endedAtMs: number
  phase: string
  taskId: string | null
  source: PomodoroLaunchSource
  endReason: PomodoroLaunchEndReason
  tool: SegmentToolKind
  runId: string
  cyclesCompletedAtStart?: number
}): Promise<typeof PomodoroLaunches.T> {
  const startedAtMs = Math.max(0, Math.floor(input.startedAtMs))
  const endedAtMs = Math.max(startedAtMs, Math.floor(input.endedAtMs))
  const durationSec = Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1000))
  return PomodoroLaunches.create(ctx, {
    userId: input.userId,
    startedAtMs,
    endedAtMs,
    durationSec,
    phase: input.phase,
    taskId: input.taskId,
    cyclesCompletedAtStart: Math.max(0, Math.floor(input.cyclesCompletedAtStart ?? 0)),
    source: input.source,
    endReason: input.endReason,
    tool: input.tool,
    runId: input.runId,
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
  month: number,
): Promise<Record<string, number>> {
  const monthStartMs = new Date(year, month - 1, 1).getTime()
  const monthEndMs = new Date(year, month, 1).getTime()

  const launches = await PomodoroLaunches.findAll(ctx, { where: { userId, phase: 'work' } })

  const focusByDay: Record<string, number> = {}
  for (const launch of launches) {
    if (!launch.endedAtMs || launch.durationSec == null) continue
    if (launch.startedAtMs >= monthStartMs && launch.startedAtMs < monthEndMs) {
      const key = msToDayKey(launch.startedAtMs)
      focusByDay[key] = (focusByDay[key] ?? 0) + (launch.durationSec ?? 0)
    }
  }
  return focusByDay
}
