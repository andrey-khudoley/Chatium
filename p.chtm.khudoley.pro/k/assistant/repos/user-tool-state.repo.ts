import UserToolState from '../tables/user-tool-state.table'
import PomodoroState from '../tables/pomodoro-state.table'
import type { TimerStateEnvelope } from '../shared/focus-tools-types'
import {
  TIMER_STATE_ENVELOPE_TYPE,
  TIMER_STATE_SCHEMA,
  USER_TOOL_STATE_KEY,
} from '../shared/focus-tools-types'
import { normalizePhaseChangeSoundId, type PomodoroStateDto } from '../lib/pomodoro-types'
import type { PomodoroSliceInFocusTools } from '../shared/focus-tools-types'

const DEFAULT_WORK_MIN = 25

function defaultTimerSnapshot(statsDayKey: string) {
  return {
    status: 'stopped' as const,
    remainingSec: DEFAULT_WORK_MIN * 60,
    endsAtMs: 0,
    durationSettingMin: DEFAULT_WORK_MIN,
    durationSettingSec: 0,
    currentTaskId: '',
    currentRunId: '',
    sessionsCount: 0,
    totalFocusSec: 0,
    totalSec: 0,
    statsPeriodDayKey: statsDayKey,
  }
}

function defaultStopwatchSnapshot(statsDayKey: string) {
  return {
    status: 'stopped' as const,
    elapsedSec: 0,
    startedAtMs: 0,
    currentTaskId: '',
    currentRunId: '',
    sessionsCount: 0,
    totalFocusSec: 0,
    totalSec: 0,
    statsPeriodDayKey: statsDayKey,
  }
}

function rowToPomodoroDto(row: typeof PomodoroState.T, statsDayKey: string): PomodoroSliceInFocusTools {
  const rawAfterLongRest = row.afterLongRest as PomodoroStateDto['afterLongRest'] | 'stop'
  const afterLongRest =
    rawAfterLongRest === 'auto' || rawAfterLongRest === 'overtime' || rawAfterLongRest === 'stop'
      ? rawAfterLongRest
      : 'pause'
  const workM = Math.max(1, Math.min(180, Math.floor(row.workMinutes ?? DEFAULT_WORK_MIN)))
  return {
    status: (row.status as PomodoroSliceInFocusTools['status']) ?? 'stopped',
    phase: (row.phase as PomodoroSliceInFocusTools['phase']) ?? 'work',
    currentTaskId: row.currentTaskId ?? '',
    currentRunId: '',
    phaseRemainingSec: Math.max(0, Math.floor(row.phaseRemainingSec ?? workM * 60)),
    phaseEndsAtMs: row.phaseEndsAtMs ?? 0,
    cyclesCompleted: Math.max(0, Math.floor(row.cyclesCompleted ?? 0)),
    totalWorkSec: Math.max(0, Math.floor(row.totalWorkSec ?? 0)),
    totalRestSec: Math.max(0, Math.floor(row.totalRestSec ?? 0)),
    totalSec: Math.max(0, Math.floor((row.totalWorkSec ?? 0) + (row.totalRestSec ?? 0))),
    workMinutes: workM,
    restMinutes: Math.max(1, Math.min(180, Math.floor(row.restMinutes ?? 5))),
    longRestMinutes: Math.max(1, Math.min(180, Math.floor(row.longRestMinutes ?? 20))),
    cyclesUntilLongRest: Math.max(1, Math.min(12, Math.floor(row.cyclesUntilLongRest ?? 4))),
    pauseAfterWork: !!row.pauseAfterWork,
    pauseAfterRest: !!row.pauseAfterRest,
    afterLongRest,
    autoStartRest: !!row.autoStartRest,
    autoStartNextCycle: !!row.autoStartNextCycle,
    phaseChangeSound: normalizePhaseChangeSoundId(row.phaseChangeSound ?? 3),
    tasksCompletedToday: Math.max(0, Math.floor(row.tasksCompletedToday ?? 0)),
    updatedAtMs: row.updatedAtMs ?? Date.now(),
    statsPeriodDayKey: row.statsPeriodDayKey ?? statsDayKey,
  }
}

export async function findUserToolStateRow(
  ctx: app.Ctx,
  userId: string,
  key: string,
): Promise<typeof UserToolState.T | null> {
  const rows = await UserToolState.findAll(ctx, { where: { userId, key }, limit: 1 })
  return rows[0] ?? null
}

export async function createDefaultEnvelope(
  ctx: app.Ctx,
  userId: string,
  statsDayKey: string,
): Promise<TimerStateEnvelope> {
  const workM = DEFAULT_WORK_MIN
  const pomodoro: PomodoroSliceInFocusTools = {
    status: 'stopped',
    phase: 'work',
    currentTaskId: '',
    currentRunId: '',
    phaseRemainingSec: workM * 60,
    phaseEndsAtMs: 0,
    cyclesCompleted: 0,
    totalWorkSec: 0,
    totalRestSec: 0,
    totalSec: 0,
    workMinutes: workM,
    restMinutes: 5,
    longRestMinutes: 20,
    cyclesUntilLongRest: 4,
    pauseAfterWork: false,
    pauseAfterRest: false,
    afterLongRest: 'pause',
    autoStartRest: false,
    autoStartNextCycle: false,
    phaseChangeSound: 3,
    tasksCompletedToday: 0,
    updatedAtMs: Date.now(),
    statsPeriodDayKey: statsDayKey,
  }
  return {
    type: TIMER_STATE_ENVELOPE_TYPE,
    schema: TIMER_STATE_SCHEMA,
    data: {
      activeMode: 'clock',
      pomodoro,
      timer: defaultTimerSnapshot(statsDayKey),
      stopwatch: defaultStopwatchSnapshot(statsDayKey),
    },
  }
}

async function migrateFromLegacyPomodoroRow(
  ctx: app.Ctx,
  _userId: string,
  legacy: typeof PomodoroState.T,
  statsDayKey: string,
): Promise<TimerStateEnvelope> {
  const pomodoro = rowToPomodoroDto(legacy, statsDayKey)
  return {
    type: TIMER_STATE_ENVELOPE_TYPE,
    schema: TIMER_STATE_SCHEMA,
    data: {
      activeMode: 'clock',
      pomodoro,
      timer: defaultTimerSnapshot(statsDayKey),
      stopwatch: defaultStopwatchSnapshot(statsDayKey),
    },
  }
}

/** Возвращает envelope; при отсутствии строки — миграция из legacy pomodoro-state или дефолт. */
export async function getOrCreateTimerStateEnvelope(
  ctx: app.Ctx,
  userId: string,
  statsDayKey: string,
): Promise<{ row: typeof UserToolState.T; envelope: TimerStateEnvelope }> {
  const existing = await findUserToolStateRow(ctx, userId, USER_TOOL_STATE_KEY)
  if (existing?.value && typeof existing.value === 'object') {
    const v = existing.value as Partial<TimerStateEnvelope>
    if (v.type === TIMER_STATE_ENVELOPE_TYPE && v.schema === TIMER_STATE_SCHEMA && v.data) {
      return { row: existing, envelope: v as TimerStateEnvelope }
    }
  }

  let envelope: TimerStateEnvelope
  if (!existing) {
    const legacyRows = await PomodoroState.findAll(ctx, { where: { userId }, limit: 1 })
    const legacy = legacyRows[0]
    if (legacy) {
      envelope = await migrateFromLegacyPomodoroRow(ctx, userId, legacy, statsDayKey)
    } else {
      envelope = await createDefaultEnvelope(ctx, userId, statsDayKey)
    }
    const now = Date.now()
    const row = await UserToolState.create(ctx, {
      userId,
      key: USER_TOOL_STATE_KEY,
      value: envelope as unknown as Record<string, unknown>,
      updatedAtMs: now,
    })
    return { row, envelope }
  }

  envelope = await createDefaultEnvelope(ctx, userId, statsDayKey)
  const updated = await UserToolState.update(ctx, {
    id: existing.id,
    value: envelope as unknown as Record<string, unknown>,
    updatedAtMs: Date.now(),
  })
  return { row: updated, envelope }
}

export async function saveTimerStateEnvelope(
  ctx: app.Ctx,
  rowId: string,
  envelope: TimerStateEnvelope,
): Promise<typeof UserToolState.T> {
  return UserToolState.update(ctx, {
    id: rowId,
    value: envelope as unknown as Record<string, unknown>,
    updatedAtMs: Date.now(),
  })
}
