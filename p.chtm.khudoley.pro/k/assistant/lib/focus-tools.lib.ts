import { runWithExclusiveLock } from '@app/sync'
import { sendDataToSocket } from '@app/socket'
import { nanoid } from '@app/nanoid'
import * as userToolStateRepo from '../repos/user-tool-state.repo'
import * as toolSegmentsRepo from '../repos/tool-segments.repo'
import * as tasksRepo from '../repos/tasks.repo'
import type { PomodoroSettingsInput, PomodoroStateDto } from './pomodoro-types'
import { getPhaseCompletionActionForPhase, normalizePhaseChangeSoundId } from './pomodoro-types'
import type { PomodoroLaunchEndReason, PomodoroLaunchSource } from '../tables/pomodoro-launches.table'
import UserToolState from '../tables/user-tool-state.table'
import type { FocusToolsFullStateDto, FocusToolsStateData, TimerStateEnvelope } from '../shared/focus-tools-types'
import { focusToolsSocketId } from '../shared/focus-tools-types'
import type { PomodoroSliceInFocusTools } from '../shared/focus-tools-types'
import { computePomodoroStatsDayKeyForUtcOffsetHours } from './pomodoro-stats-day'
import * as userSettingsLib from './user-settings.lib'

function lockKey(userId: string): string {
  return `assistant:focus-tools:${userId}`
}

function newRunId(): string {
  return nanoid()
}

/**
 * Ключ календарных суток для статистики — только с сервера (Heap `timezoneOffsetHours` + `nowMs`).
 * Не подставляем `statsDayKey` с клиента: иначе POST и следующий GET могут получить разные ключи
 * (потерян query, иной парсинг, гонка) → {@link applyDayRollover} обнуляет счётчики после успешного действия.
 */
async function expectedDayKey(ctx: app.Ctx, userId: string, nowMs: number): Promise<string> {
  const offset = await userSettingsLib.getEffectiveTimezoneOffsetHours(ctx, userId)
  return computePomodoroStatsDayKeyForUtcOffsetHours(nowMs, offset)
}

function normalizeEnvelope(envelope: TimerStateEnvelope): TimerStateEnvelope {
  const d = envelope.data
  if (!d.pomodoro.currentRunId) d.pomodoro.currentRunId = ''
  d.pomodoro.totalSec = d.pomodoro.totalWorkSec + d.pomodoro.totalRestSec
  return envelope
}

function patchPomodoro(data: FocusToolsStateData, patch: Partial<PomodoroSliceInFocusTools>): FocusToolsStateData {
  const p = { ...data.pomodoro, ...patch }
  p.totalSec = p.totalWorkSec + p.totalRestSec
  p.updatedAtMs = Date.now()
  return { ...data, pomodoro: p }
}

function applyDayRollover(data: FocusToolsStateData, expectedKey: string): FocusToolsStateData {
  let next = { ...data }
  if (next.pomodoro.statsPeriodDayKey !== expectedKey) {
    next = patchPomodoro(next, {
      statsPeriodDayKey: expectedKey,
      totalWorkSec: 0,
      totalRestSec: 0,
      tasksCompletedToday: 0,
    })
  }
  if (next.timer.statsPeriodDayKey !== expectedKey) {
    next = {
      ...next,
      timer: {
        ...next.timer,
        statsPeriodDayKey: expectedKey,
        sessionsCount: 0,
        totalFocusSec: 0,
        totalSec: 0,
      },
    }
  }
  if (next.stopwatch.statsPeriodDayKey !== expectedKey) {
    next = {
      ...next,
      stopwatch: {
        ...next.stopwatch,
        statsPeriodDayKey: expectedKey,
        sessionsCount: 0,
        totalFocusSec: 0,
        totalSec: 0,
      },
    }
  }
  return next
}

async function pushSocket(ctx: app.Ctx, userId: string, payload: FocusToolsFullStateDto): Promise<void> {
  try {
    await sendDataToSocket(ctx, focusToolsSocketId(userId), {
      type: 'state-update',
      data: payload,
    })
  } catch (error) {
    ctx.account.log('focus-tools pushSocket failed', { json: { userId, error: String(error) } })
  }
}

async function persist(
  ctx: app.Ctx,
  rowId: string,
  envelope: TimerStateEnvelope,
  userId: string,
  serverNowMs: number,
  doPush: boolean,
): Promise<FocusToolsFullStateDto> {
  normalizeEnvelope(envelope)
  await userToolStateRepo.saveTimerStateEnvelope(ctx, rowId, envelope)
  const full: FocusToolsFullStateDto = { state: envelope.data, serverNowMs }
  if (doPush) await pushSocket(ctx, userId, full)
  return full
}

async function startPomodoroSegment(
  ctx: app.Ctx,
  userId: string,
  p: PomodoroSliceInFocusTools,
  source: PomodoroLaunchSource,
  nowMs: number,
): Promise<void> {
  if (p.status !== 'running') return
  const runId = p.currentRunId || newRunId()
  if (!p.currentRunId) {
    p.currentRunId = runId
  }
  await toolSegmentsRepo.startSegment(ctx, {
    userId,
    source,
    startedAtMs: nowMs,
    state: p,
    tool: 'pomodoro',
    runId: p.currentRunId,
  })
}

async function closePomodoroSegment(
  ctx: app.Ctx,
  userId: string,
  nowMs: number,
  endReason: PomodoroLaunchEndReason,
): Promise<void> {
  await toolSegmentsRepo.closeOpenSegmentByUserAndTool(ctx, userId, 'pomodoro', nowMs, endReason)
}

async function pauseTimerAndStopwatch(ctx: app.Ctx, userId: string, nowMs: number, data: FocusToolsStateData): Promise<FocusToolsStateData> {
  let d = { ...data }
  if (d.timer.status === 'running') {
    const rem = Math.max(0, Math.floor((d.timer.endsAtMs - nowMs) / 1000))
    const closed = await toolSegmentsRepo.closeOpenSegmentByUserAndTool(ctx, userId, 'timer', nowMs, 'pause')
    const add = closed?.durationSec ?? 0
    d = {
      ...d,
      timer: {
        ...d.timer,
        status: 'paused',
        remainingSec: rem,
        endsAtMs: 0,
        totalFocusSec: d.timer.totalFocusSec + add,
        totalSec: d.timer.totalSec + add,
      },
    }
  }
  if (d.stopwatch.status === 'running') {
    const elapsed = d.stopwatch.elapsedSec + Math.floor((nowMs - d.stopwatch.startedAtMs) / 1000)
    const closed = await toolSegmentsRepo.closeOpenSegmentByUserAndTool(ctx, userId, 'stopwatch', nowMs, 'pause')
    const add = closed?.durationSec ?? 0
    d = {
      ...d,
      stopwatch: {
        ...d.stopwatch,
        status: 'paused',
        elapsedSec: elapsed,
        startedAtMs: 0,
        totalFocusSec: d.stopwatch.totalFocusSec + add,
        totalSec: d.stopwatch.totalSec + add,
      },
    }
  }
  return d
}

async function pausePomodoroIfRunning(
  ctx: app.Ctx,
  userId: string,
  nowMs: number,
  data: FocusToolsStateData,
): Promise<FocusToolsStateData> {
  let d = { ...data }
  const p = d.pomodoro
  if (p.status !== 'running') return d
  const remaining = Math.max(0, Math.floor((p.phaseEndsAtMs - nowMs) / 1000))
  await closePomodoroSegment(ctx, userId, nowMs, 'pause')
  d = patchPomodoro(d, { status: 'paused', phaseRemainingSec: remaining, phaseEndsAtMs: 0 })
  return d
}

async function moveToNextPhase(
  ctx: app.Ctx,
  userId: string,
  state: PomodoroSliceInFocusTools,
  nowMs: number,
  source: PomodoroLaunchSource,
  data: FocusToolsStateData,
): Promise<FocusToolsStateData> {
  let d = data
  if (state.phase === 'work') {
    const nextCycles = state.cyclesCompleted + 1
    const longBreak = nextCycles % state.cyclesUntilLongRest === 0
    const nextPhase = longBreak ? 'long_rest' : 'rest'
    const nextRemainingSec = longBreak ? state.longRestMinutes * 60 : state.restMinutes * 60
    let p = { ...state, cyclesCompleted: nextCycles, tasksCompletedToday: state.tasksCompletedToday + 1, phase: nextPhase as PomodoroSliceInFocusTools['phase'], status: 'running' as const, phaseRemainingSec: nextRemainingSec, phaseEndsAtMs: nowMs + nextRemainingSec * 1000 }
    p.totalSec = p.totalWorkSec + p.totalRestSec
    p.updatedAtMs = Date.now()
    d = { ...d, pomodoro: p }
    await startPomodoroSegment(ctx, userId, d.pomodoro, source, nowMs)
    return d
  }
  const nextRemainingSec = state.workMinutes * 60
  let p = {
    ...state,
    phase: 'work' as PomodoroSliceInFocusTools['phase'],
    status: 'running' as const,
    phaseRemainingSec: nextRemainingSec,
    phaseEndsAtMs: nowMs + nextRemainingSec * 1000,
  }
  p.totalSec = p.totalWorkSec + p.totalRestSec
  p.updatedAtMs = Date.now()
  d = { ...d, pomodoro: p }
  await startPomodoroSegment(ctx, userId, d.pomodoro, source, nowMs)
  return d
}

async function advanceToNextPhaseAfterOvertime(
  ctx: app.Ctx,
  userId: string,
  state: PomodoroSliceInFocusTools,
  nowMs: number,
  source: PomodoroLaunchSource,
  data: FocusToolsStateData,
): Promise<FocusToolsStateData> {
  if (state.phase === 'long_rest' && state.afterLongRest === 'stop') {
    return patchPomodoro(data, {
      status: 'stopped',
      phase: 'work',
      phaseRemainingSec: state.workMinutes * 60,
      phaseEndsAtMs: 0,
      currentTaskId: '',
      currentRunId: '',
    })
  }
  return moveToNextPhase(ctx, userId, state, nowMs, source, data)
}

async function skipFromRunningPhase(
  ctx: app.Ctx,
  userId: string,
  nowMs: number,
  state: PomodoroSliceInFocusTools,
  data: FocusToolsStateData,
): Promise<FocusToolsStateData> {
  let d = patchPomodoro(data, { phaseRemainingSec: 0 })
  await closePomodoroSegment(ctx, userId, d.pomodoro.updatedAtMs, 'phase_skip')

  if (state.phase === 'work') {
    const nextCycles = state.cyclesCompleted + 1
    const longBreak = nextCycles % state.cyclesUntilLongRest === 0
    const nextPhase = longBreak ? 'long_rest' : 'rest'
    const nextRemainingSec = longBreak ? state.longRestMinutes * 60 : state.restMinutes * 60
    let p = {
      ...d.pomodoro,
      cyclesCompleted: nextCycles,
      tasksCompletedToday: state.tasksCompletedToday + 1,
      phase: nextPhase as PomodoroSliceInFocusTools['phase'],
      status: 'running' as const,
      phaseRemainingSec: nextRemainingSec,
      phaseEndsAtMs: nowMs + nextRemainingSec * 1000,
    }
    p.totalSec = p.totalWorkSec + p.totalRestSec
    p.updatedAtMs = Date.now()
    d = { ...d, pomodoro: p }
    await startPomodoroSegment(ctx, userId, d.pomodoro, 'skip', nowMs)
    return d
  }

  if (state.phase === 'long_rest' && state.afterLongRest === 'stop') {
    return patchPomodoro(d, {
      status: 'stopped',
      phase: 'work',
      phaseRemainingSec: state.workMinutes * 60,
      phaseEndsAtMs: 0,
      currentTaskId: '',
      currentRunId: '',
    })
  }

  const nextRemainingSec = state.workMinutes * 60
  let p = {
    ...d.pomodoro,
    phase: 'work' as const,
    status: 'running' as const,
    phaseRemainingSec: nextRemainingSec,
    phaseEndsAtMs: nowMs + nextRemainingSec * 1000,
  }
  p.totalSec = p.totalWorkSec + p.totalRestSec
  p.updatedAtMs = Date.now()
  d = { ...d, pomodoro: p }
  await startPomodoroSegment(ctx, userId, d.pomodoro, 'skip', nowMs)
  return d
}

async function tickPomodoro(
  ctx: app.Ctx,
  userId: string,
  nowMs: number,
  data: FocusToolsStateData,
): Promise<FocusToolsStateData> {
  let state = data.pomodoro
  let d = data
  if (state.status === 'awaiting_continue') {
    return d
  }
  if (state.status !== 'running') {
    await closePomodoroSegment(ctx, userId, nowMs, 'state_recovered')
    return d
  }
  let elapsedSec = Math.max(0, Math.floor((nowMs - state.updatedAtMs) / 1000))
  if (elapsedSec <= 0) return d
  while (elapsedSec > 0 && state.status === 'running') {
    const currentRemaining = Math.max(0, Math.floor((state.phaseEndsAtMs - state.updatedAtMs) / 1000))
    const spent = Math.min(elapsedSec, currentRemaining)
    const addWork = state.phase === 'work' ? spent : 0
    const addRest = state.phase === 'work' ? 0 : spent
    if (state.currentTaskId && spent > 0) {
      await tasksRepo.addPomodoroSecondsToTask(ctx, userId, state.currentTaskId, addWork, addRest)
    }
    state = {
      ...state,
      totalWorkSec: state.totalWorkSec + addWork,
      totalRestSec: state.totalRestSec + addRest,
      phaseRemainingSec: Math.max(0, currentRemaining - spent),
      totalSec: state.totalWorkSec + addWork + state.totalRestSec + addRest,
      updatedAtMs: Date.now(),
    }
    d = { ...d, pomodoro: state }
    elapsedSec -= spent
    if (state.phaseRemainingSec > 0) break

    const completedPhase = state.phase
    await closePomodoroSegment(ctx, userId, state.updatedAtMs, 'phase_completed')
    const action = getPhaseCompletionActionForPhase(state, completedPhase)

    if (action === 'overtime') {
      const overtimeAnchorMs = state.phaseEndsAtMs
      if (completedPhase === 'work') {
        const nextCycles = state.cyclesCompleted + 1
        state = {
          ...state,
          cyclesCompleted: nextCycles,
          tasksCompletedToday: state.tasksCompletedToday + 1,
          status: 'awaiting_continue',
          phaseRemainingSec: 0,
          phaseEndsAtMs: overtimeAnchorMs,
          updatedAtMs: Date.now(),
        }
      } else {
        state = {
          ...state,
          status: 'awaiting_continue',
          phaseRemainingSec: 0,
          phaseEndsAtMs: overtimeAnchorMs,
          updatedAtMs: Date.now(),
        }
      }
      d = { ...d, pomodoro: state }
      break
    }

    if (action === 'pause') {
      if (completedPhase === 'long_rest' && state.afterLongRest === 'stop') {
        state = {
          ...state,
          status: 'stopped',
          phase: 'work',
          phaseRemainingSec: state.workMinutes * 60,
          phaseEndsAtMs: 0,
          currentTaskId: '',
          currentRunId: '',
          updatedAtMs: Date.now(),
        }
        d = { ...d, pomodoro: state }
      } else {
        d = await moveToNextPhase(ctx, userId, state, state.updatedAtMs, 'auto_next_phase', d)
        state = d.pomodoro
        d = patchPomodoro(d, {
          status: 'paused',
          phaseRemainingSec: state.phaseRemainingSec,
          phaseEndsAtMs: 0,
        })
        state = d.pomodoro
        await closePomodoroSegment(ctx, userId, state.updatedAtMs, 'pause')
      }
      break
    }

    d = await moveToNextPhase(ctx, userId, state, state.updatedAtMs, 'auto_next_phase', d)
    state = d.pomodoro
  }
  return d
}

async function tickTimerComplete(ctx: app.Ctx, userId: string, nowMs: number, data: FocusToolsStateData): Promise<FocusToolsStateData> {
  if (data.timer.status !== 'running') return data
  if (nowMs < data.timer.endsAtMs) return data
  const closed = await toolSegmentsRepo.closeOpenSegmentByUserAndTool(
    ctx,
    userId,
    'timer',
    data.timer.endsAtMs,
    'phase_completed',
  )
  const add = closed?.durationSec ?? 0
  return {
    ...data,
    timer: {
      ...data.timer,
      status: 'stopped',
      remainingSec: 0,
      endsAtMs: 0,
      currentRunId: '',
      totalFocusSec: data.timer.totalFocusSec + add,
      totalSec: data.timer.totalSec + add,
    },
  }
}

async function loadAndNormalize(
  ctx: app.Ctx,
  userId: string,
  statsDayKey: string,
): Promise<{ row: typeof UserToolState.T; envelope: TimerStateEnvelope }> {
  const { row, envelope } = await userToolStateRepo.getOrCreateTimerStateEnvelope(ctx, userId, statsDayKey)
  normalizeEnvelope(envelope)
  return { row, envelope }
}

export async function getFullState(ctx: app.Ctx, userId: string): Promise<FocusToolsFullStateDto> {
  return runWithExclusiveLock(ctx, lockKey(userId), async () => {
    const nowMs = Date.now()
    const dayKey = await expectedDayKey(ctx, userId, nowMs)
    const { row, envelope } = await loadAndNormalize(ctx, userId, dayKey)
    let data = envelope.data
    data = applyDayRollover(data, dayKey)
    data = await tickPomodoro(ctx, userId, nowMs, data)
    data = await tickTimerComplete(ctx, userId, nowMs, data)
    envelope.data = data
    await userToolStateRepo.saveTimerStateEnvelope(ctx, row.id, envelope)
    return { state: data, serverNowMs: nowMs }
  })
}

export async function executeCommand(
  ctx: app.Ctx,
  userId: string,
  body: { statsDayKey?: string; command?: unknown },
  options?: { push?: boolean },
): Promise<FocusToolsFullStateDto> {
  const doPush = options?.push !== false
  return runWithExclusiveLock(ctx, lockKey(userId), async () => {
    const nowMs = Date.now()
    const dayKey = await expectedDayKey(ctx, userId, nowMs)
    const { row, envelope } = await loadAndNormalize(ctx, userId, dayKey)
    let data = envelope.data
    data = applyDayRollover(data, dayKey)
    data = await tickPomodoro(ctx, userId, nowMs, data)
    data = await tickTimerComplete(ctx, userId, nowMs, data)

    const cmd = body as Record<string, unknown>
    const kind = cmd?.command && typeof cmd.command === 'object' ? (cmd.command as Record<string, unknown>).kind : null

    if (kind === 'widget-mode') {
      const mode = (cmd.command as { mode?: string }).mode
      if (mode === 'clock' || mode === 'pomodoro' || mode === 'timer' || mode === 'stopwatch') {
        data = { ...data, activeMode: mode }
      }
    } else if (kind === 'save-pomodoro-settings') {
      const settings = (cmd.command as { settings?: PomodoroSettingsInput }).settings
      if (settings) {
        const workMinutes = Math.max(1, Math.min(180, Math.floor(settings.workMinutes)))
        const restMinutes = Math.max(1, Math.min(180, Math.floor(settings.restMinutes)))
        const longRestMinutes = Math.max(1, Math.min(180, Math.floor(settings.longRestMinutes)))
        const cyclesUntilLongRest = Math.max(1, Math.min(12, Math.floor(settings.cyclesUntilLongRest)))
        const phaseChangeSound = normalizePhaseChangeSoundId(settings.phaseChangeSound)
        data = patchPomodoro(data, {
          workMinutes,
          restMinutes,
          longRestMinutes,
          cyclesUntilLongRest,
          pauseAfterWork: settings.pauseAfterWork,
          pauseAfterRest: settings.pauseAfterRest,
          afterLongRest: settings.afterLongRest,
          autoStartRest: settings.autoStartRest,
          autoStartNextCycle: settings.autoStartNextCycle,
          phaseChangeSound,
          phaseRemainingSec: data.pomodoro.status === 'stopped' ? workMinutes * 60 : data.pomodoro.phaseRemainingSec,
        })
      }
    } else if (kind === 'assign-task') {
      const taskId = String((cmd.command as { taskId?: string }).taskId ?? '').trim()
      if (taskId) {
        const task = await tasksRepo.findTaskByIdForUser(ctx, userId, taskId)
        if (!task) throw new Error('Task not found')
      }
      const nextTaskId = taskId || ''
      const p = data.pomodoro
      if (p.status === 'running' && (p.currentTaskId || '') !== nextTaskId) {
        await closePomodoroSegment(ctx, userId, nowMs, 'task_changed')
        data = patchPomodoro(data, { currentTaskId: nextTaskId })
        await startPomodoroSegment(ctx, userId, data.pomodoro, 'task_changed', nowMs)
      } else {
        data = patchPomodoro(data, { currentTaskId: nextTaskId })
      }
      if (data.timer.status === 'running' && (data.timer.currentTaskId || '') !== nextTaskId) {
        await toolSegmentsRepo.closeOpenSegmentByUserAndTool(ctx, userId, 'timer', nowMs, 'task_changed')
        const rid = data.timer.currentRunId || newRunId()
        data = {
          ...data,
          timer: { ...data.timer, currentTaskId: nextTaskId, currentRunId: rid || newRunId() },
        }
        await toolSegmentsRepo.startSegment(ctx, {
          userId,
          source: 'task_changed',
          startedAtMs: nowMs,
          state: { phase: 'work', currentTaskId: nextTaskId, cyclesCompleted: 0 },
          tool: 'timer',
          runId: data.timer.currentRunId,
        })
      } else if (data.timer.status !== 'running') {
        data = { ...data, timer: { ...data.timer, currentTaskId: nextTaskId } }
      }
      if (data.stopwatch.status === 'running' && (data.stopwatch.currentTaskId || '') !== nextTaskId) {
        await toolSegmentsRepo.closeOpenSegmentByUserAndTool(ctx, userId, 'stopwatch', nowMs, 'task_changed')
        const rid = data.stopwatch.currentRunId || newRunId()
        data = {
          ...data,
          stopwatch: { ...data.stopwatch, currentTaskId: nextTaskId, currentRunId: rid || newRunId() },
        }
        await toolSegmentsRepo.startSegment(ctx, {
          userId,
          source: 'task_changed',
          startedAtMs: nowMs,
          state: { phase: 'work', currentTaskId: nextTaskId, cyclesCompleted: 0 },
          tool: 'stopwatch',
          runId: data.stopwatch.currentRunId,
        })
      } else if (data.stopwatch.status !== 'running') {
        data = { ...data, stopwatch: { ...data.stopwatch, currentTaskId: nextTaskId } }
      }
    } else if (kind === 'timer-settings') {
      const minutes = Math.max(0, Math.min(999, Math.floor(Number((cmd.command as { minutes?: number }).minutes))))
      const seconds = Math.max(0, Math.min(59, Math.floor(Number((cmd.command as { seconds?: number }).seconds))))
      const dur = Math.max(1, minutes * 60 + seconds)
      data = {
        ...data,
        timer: {
          ...data.timer,
          durationSettingMin: minutes,
          durationSettingSec: seconds,
          remainingSec: data.timer.status === 'stopped' ? dur : data.timer.remainingSec,
        },
      }
    } else if (kind === 'pomodoro') {
      const action = (cmd.command as { action?: string }).action
      data = await handlePomodoroAction(ctx, userId, nowMs, data, action)
    } else if (kind === 'timer') {
      const action = (cmd.command as { action?: string }).action
      data = await handleTimerAction(ctx, userId, nowMs, data, action)
    } else if (kind === 'stopwatch') {
      const action = (cmd.command as { action?: string }).action
      data = await handleStopwatchAction(ctx, userId, nowMs, data, action)
    }

    envelope.data = data
    return persist(ctx, row.id, envelope, userId, Date.now(), doPush)
  })
}

async function handlePomodoroAction(
  ctx: app.Ctx,
  userId: string,
  nowMs: number,
  data: FocusToolsStateData,
  action: string | undefined,
): Promise<FocusToolsStateData> {
  let d = data
  if (action === 'start') {
    d = await pauseTimerAndStopwatch(ctx, userId, nowMs, d)
    await closePomodoroSegment(ctx, userId, nowMs, 'restart')
    const remaining = d.pomodoro.workMinutes * 60
    const runId = newRunId()
    d = patchPomodoro(d, {
      phase: 'work',
      status: 'running',
      phaseRemainingSec: remaining,
      phaseEndsAtMs: nowMs + remaining * 1000,
      cyclesCompleted: 0,
      currentRunId: runId,
    })
    await startPomodoroSegment(ctx, userId, d.pomodoro, 'start', nowMs)
    return d
  }
  if (action === 'resume') {
    d = await pauseTimerAndStopwatch(ctx, userId, nowMs, d)
    const p = d.pomodoro
    if (p.status === 'awaiting_continue') {
      return advanceToNextPhaseAfterOvertime(ctx, userId, p, nowMs, 'continue', d)
    }
    if (p.status !== 'paused') return d
    const remaining = Math.max(1, p.phaseRemainingSec)
    const runId = p.currentRunId || newRunId()
    d = patchPomodoro(d, {
      status: 'running',
      phaseRemainingSec: remaining,
      phaseEndsAtMs: nowMs + remaining * 1000,
      currentRunId: runId,
    })
    await startPomodoroSegment(ctx, userId, d.pomodoro, 'resume', nowMs)
    return d
  }
  if (action === 'skip') {
    const p = d.pomodoro
    if (p.status === 'awaiting_continue') {
      return advanceToNextPhaseAfterOvertime(ctx, userId, p, nowMs, 'skip', d)
    }
    if (p.status !== 'running') return d
    return skipFromRunningPhase(ctx, userId, nowMs, p, d)
  }
  if (action === 'pause') {
    const p = d.pomodoro
    if (p.status !== 'running') return d
    const remaining = Math.max(0, Math.floor((p.phaseEndsAtMs - nowMs) / 1000))
    await closePomodoroSegment(ctx, userId, nowMs, 'pause')
    return patchPomodoro(d, { status: 'paused', phaseRemainingSec: remaining, phaseEndsAtMs: 0 })
  }
  if (action === 'stop') {
    await closePomodoroSegment(ctx, userId, nowMs, 'stop')
    return patchPomodoro(d, {
      status: 'stopped',
      phase: 'work',
      phaseRemainingSec: d.pomodoro.workMinutes * 60,
      phaseEndsAtMs: 0,
      currentTaskId: '',
      currentRunId: '',
    })
  }
  if (action === 'reset') {
    const p = d.pomodoro
    if (p.status === 'stopped') return d
    await closePomodoroSegment(ctx, userId, nowMs, 'stop')
    return patchPomodoro(d, {
      status: 'stopped',
      phase: 'work',
      phaseRemainingSec: p.workMinutes * 60,
      phaseEndsAtMs: 0,
      currentTaskId: '',
      currentRunId: '',
      cyclesCompleted: 0,
    })
  }
  return d
}

async function handleTimerAction(
  ctx: app.Ctx,
  userId: string,
  nowMs: number,
  data: FocusToolsStateData,
  action: string | undefined,
): Promise<FocusToolsStateData> {
  let d = data
  if (action === 'start') {
    d = await pausePomodoroIfRunning(ctx, userId, nowMs, d)
    d = await pauseStopwatchOnly(ctx, userId, nowMs, d)
    const duration = Math.max(1, d.timer.durationSettingMin * 60 + d.timer.durationSettingSec)
    const runId = newRunId()
    d = {
      ...d,
      timer: {
        ...d.timer,
        status: 'running',
        remainingSec: duration,
        endsAtMs: nowMs + duration * 1000,
        currentRunId: runId,
        sessionsCount: d.timer.sessionsCount + 1,
      },
    }
    await toolSegmentsRepo.startSegment(ctx, {
      userId,
      source: 'tools_timer',
      startedAtMs: nowMs,
      state: { phase: 'work', currentTaskId: d.timer.currentTaskId, cyclesCompleted: 0 },
      tool: 'timer',
      runId,
    })
    return d
  }
  if (action === 'pause') {
    if (d.timer.status !== 'running') return d
    const rem = Math.max(0, Math.floor((d.timer.endsAtMs - nowMs) / 1000))
    const closed = await toolSegmentsRepo.closeOpenSegmentByUserAndTool(ctx, userId, 'timer', nowMs, 'pause')
    const add = closed?.durationSec ?? 0
    return {
      ...d,
      timer: {
        ...d.timer,
        status: 'paused',
        remainingSec: rem,
        endsAtMs: 0,
        totalFocusSec: d.timer.totalFocusSec + add,
        totalSec: d.timer.totalSec + add,
      },
    }
  }
  if (action === 'resume') {
    if (d.timer.status !== 'paused') return d
    d = await pausePomodoroIfRunning(ctx, userId, nowMs, d)
    d = await pauseStopwatchOnly(ctx, userId, nowMs, d)
    const rem = Math.max(1, d.timer.remainingSec)
    const runId = d.timer.currentRunId || newRunId()
    d = {
      ...d,
      timer: {
        ...d.timer,
        status: 'running',
        remainingSec: rem,
        endsAtMs: nowMs + rem * 1000,
        currentRunId: runId,
      },
    }
    await toolSegmentsRepo.startSegment(ctx, {
      userId,
      source: 'resume',
      startedAtMs: nowMs,
      state: { phase: 'work', currentTaskId: d.timer.currentTaskId, cyclesCompleted: 0 },
      tool: 'timer',
      runId,
    })
    return d
  }
  if (action === 'reset') {
    if (d.timer.status === 'running') {
      const closed = await toolSegmentsRepo.closeOpenSegmentByUserAndTool(ctx, userId, 'timer', nowMs, 'stop')
      const add = closed?.durationSec ?? 0
      d = {
        ...d,
        timer: {
          ...d.timer,
          totalFocusSec: d.timer.totalFocusSec + add,
          totalSec: d.timer.totalSec + add,
        },
      }
    }
    const dur = Math.max(1, d.timer.durationSettingMin * 60 + d.timer.durationSettingSec)
    return {
      ...d,
      timer: {
        ...d.timer,
        status: 'stopped',
        remainingSec: dur,
        endsAtMs: 0,
        currentTaskId: '',
        currentRunId: '',
      },
    }
  }
  return d
}

async function pauseStopwatchOnly(ctx: app.Ctx, userId: string, nowMs: number, data: FocusToolsStateData): Promise<FocusToolsStateData> {
  if (data.stopwatch.status !== 'running') return data
  const elapsed = data.stopwatch.elapsedSec + Math.floor((nowMs - data.stopwatch.startedAtMs) / 1000)
  const closed = await toolSegmentsRepo.closeOpenSegmentByUserAndTool(ctx, userId, 'stopwatch', nowMs, 'pause')
  const add = closed?.durationSec ?? 0
  return {
    ...data,
    stopwatch: {
      ...data.stopwatch,
      status: 'paused',
      elapsedSec: elapsed,
      startedAtMs: 0,
      totalFocusSec: data.stopwatch.totalFocusSec + add,
      totalSec: data.stopwatch.totalSec + add,
    },
  }
}

async function handleStopwatchAction(
  ctx: app.Ctx,
  userId: string,
  nowMs: number,
  data: FocusToolsStateData,
  action: string | undefined,
): Promise<FocusToolsStateData> {
  let d = data
  if (action === 'start') {
    d = await pausePomodoroIfRunning(ctx, userId, nowMs, d)
    if (d.timer.status === 'running') {
      d = await handleTimerAction(ctx, userId, nowMs, d, 'pause')
    }
    const runId = newRunId()
    d = {
      ...d,
      stopwatch: {
        ...d.stopwatch,
        status: 'running',
        elapsedSec: 0,
        startedAtMs: nowMs,
        currentRunId: runId,
        sessionsCount: d.stopwatch.sessionsCount + 1,
      },
    }
    await toolSegmentsRepo.startSegment(ctx, {
      userId,
      source: 'tools_stopwatch',
      startedAtMs: nowMs,
      state: { phase: 'work', currentTaskId: d.stopwatch.currentTaskId, cyclesCompleted: 0 },
      tool: 'stopwatch',
      runId,
    })
    return d
  }
  if (action === 'pause') {
    if (d.stopwatch.status !== 'running') return d
    const elapsed = d.stopwatch.elapsedSec + Math.floor((nowMs - d.stopwatch.startedAtMs) / 1000)
    const closed = await toolSegmentsRepo.closeOpenSegmentByUserAndTool(ctx, userId, 'stopwatch', nowMs, 'pause')
    const add = closed?.durationSec ?? 0
    return {
      ...d,
      stopwatch: {
        ...d.stopwatch,
        status: 'paused',
        elapsedSec: elapsed,
        startedAtMs: 0,
        totalFocusSec: d.stopwatch.totalFocusSec + add,
        totalSec: d.stopwatch.totalSec + add,
      },
    }
  }
  if (action === 'resume') {
    if (d.stopwatch.status !== 'paused') return d
    d = await pausePomodoroIfRunning(ctx, userId, nowMs, d)
    if (d.timer.status === 'running') {
      d = await handleTimerAction(ctx, userId, nowMs, d, 'pause')
    }
    const runId = d.stopwatch.currentRunId || newRunId()
    d = {
      ...d,
      stopwatch: {
        ...d.stopwatch,
        status: 'running',
        startedAtMs: nowMs,
        currentRunId: runId,
      },
    }
    await toolSegmentsRepo.startSegment(ctx, {
      userId,
      source: 'resume',
      startedAtMs: nowMs,
      state: { phase: 'work', currentTaskId: d.stopwatch.currentTaskId, cyclesCompleted: 0 },
      tool: 'stopwatch',
      runId,
    })
    return d
  }
  if (action === 'reset') {
    if (d.stopwatch.status === 'running') {
      const closed = await toolSegmentsRepo.closeOpenSegmentByUserAndTool(ctx, userId, 'stopwatch', nowMs, 'stop')
      const add = closed?.durationSec ?? 0
      d = {
        ...d,
        stopwatch: {
          ...d.stopwatch,
          totalFocusSec: d.stopwatch.totalFocusSec + add,
          totalSec: d.stopwatch.totalSec + add,
        },
      }
    }
    return {
      ...d,
      stopwatch: {
        ...d.stopwatch,
        status: 'stopped',
        elapsedSec: 0,
        startedAtMs: 0,
        currentTaskId: '',
        currentRunId: '',
      },
    }
  }
  return d
}

/** Для PomodoroPage: состояние помидора без полного снимка (совместимость с PomodoroStateDto). */
export function pomodoroSliceToClientDto(p: PomodoroSliceInFocusTools): PomodoroStateDto {
  const { currentRunId: _r, statsPeriodDayKey: _s, ...rest } = p
  return rest
}
