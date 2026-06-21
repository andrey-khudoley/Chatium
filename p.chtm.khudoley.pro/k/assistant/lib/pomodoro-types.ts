// @shared
export type PomodoroPhaseCompleteAction = 'auto' | 'pause' | 'overtime'
/** `stop` оставлен для обратной совместимости старых данных */
export type PomodoroAfterLongRest = PomodoroPhaseCompleteAction | 'stop'
/** 1 — самый тихий, 5 — самый выраженный; по умолчанию 3 */
export type PomodoroPhaseChangeSoundId = 1 | 2 | 3 | 4 | 5

export function normalizePhaseChangeSoundId(raw: unknown): PomodoroPhaseChangeSoundId {
  const n =
    typeof raw === 'number' && Number.isFinite(raw)
      ? raw
      : typeof raw === 'string'
        ? parseInt(raw, 10)
        : NaN
  if (!Number.isFinite(n)) return 3
  const r = Math.round(Number(n))
  return Math.max(1, Math.min(5, r)) as PomodoroPhaseChangeSoundId
}

/** До 1 ч — `MM:SS`, от 1 ч — `H:MM:SS` (например 90 мин → `1:30:00`, не `90:00`). */
export function formatPomodoroSecondsDisplay(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  if (s >= 3600) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const s2 = s % 60
    return `${h}:${String(m).padStart(2, '0')}:${String(s2).padStart(2, '0')}`
  }
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export type PomodoroPhase = 'work' | 'rest' | 'long_rest'
/** awaiting_continue — фаза закончилась по таймеру, идёт «овертайм» до нажатия «Продолжить» */
export type PomodoroStatus = 'stopped' | 'running' | 'paused' | 'awaiting_continue'

export type PomodoroStateDto = {
  status: PomodoroStatus
  phase: PomodoroPhase
  currentTaskId: string
  phaseRemainingSec: number
  phaseEndsAtMs: number
  cyclesCompleted: number
  totalWorkSec: number
  totalRestSec: number
  totalSec: number
  workMinutes: number
  restMinutes: number
  longRestMinutes: number
  cyclesUntilLongRest: number
  pauseAfterWork: boolean
  pauseAfterRest: boolean
  afterLongRest: PomodoroAfterLongRest
  autoStartRest: boolean
  autoStartNextCycle: boolean
  phaseChangeSound: PomodoroPhaseChangeSoundId
  tasksCompletedToday: number
  updatedAtMs: number
}

export type PomodoroSettingsInput = {
  workMinutes: number
  restMinutes: number
  longRestMinutes: number
  cyclesUntilLongRest: number
  pauseAfterWork: boolean
  pauseAfterRest: boolean
  afterLongRest: PomodoroAfterLongRest
  autoStartRest: boolean
  autoStartNextCycle: boolean
  phaseChangeSound: PomodoroPhaseChangeSoundId
}

/** Действие по окончании текущей фазы (совпадает с логикой `tickPomodoro` на сервере). */
export function getPhaseCompletionActionForPhase(
  state: Pick<
    PomodoroStateDto,
    'autoStartRest' | 'pauseAfterWork' | 'autoStartNextCycle' | 'pauseAfterRest' | 'afterLongRest'
  >,
  phase: PomodoroPhase,
): PomodoroPhaseCompleteAction {
  if (phase === 'work') {
    if (state.autoStartRest) return 'auto'
    if (state.pauseAfterWork) return 'pause'
    return 'overtime'
  }
  if (phase === 'rest') {
    if (state.autoStartNextCycle) return 'auto'
    if (state.pauseAfterRest) return 'pause'
    return 'overtime'
  }
  if (state.afterLongRest === 'auto') return 'auto'
  if (state.afterLongRest === 'overtime') return 'overtime'
  return 'pause'
}
