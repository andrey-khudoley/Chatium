// @shared
import type { PomodoroStateDto, PomodoroSettingsInput } from '../lib/pomodoro-types'

/** Ключ строки в Heap user-tool-state */
export const USER_TOOL_STATE_KEY = 'timer_state' as const

export const TIMER_STATE_ENVELOPE_TYPE = 'timer_state' as const
export const TIMER_STATE_SCHEMA = '1' as const

export type HeaderWidgetMode = 'clock' | 'pomodoro' | 'timer' | 'stopwatch'

export type FocusLocalClockStatus = 'stopped' | 'running' | 'paused'

export type FocusToolKind = 'pomodoro' | 'timer' | 'stopwatch'

/** Сегменты: явный инструмент (для новых записей; старые — null). */
export type SegmentToolKind = FocusToolKind

export type TimerToolSnapshot = {
  status: FocusLocalClockStatus
  remainingSec: number
  endsAtMs: number
  durationSettingMin: number
  durationSettingSec: number
  currentTaskId: string
  currentRunId: string
  sessionsCount: number
  totalFocusSec: number
  totalSec: number
  statsPeriodDayKey: string
}

export type StopwatchToolSnapshot = {
  status: FocusLocalClockStatus
  elapsedSec: number
  startedAtMs: number
  currentTaskId: string
  currentRunId: string
  sessionsCount: number
  totalFocusSec: number
  totalSec: number
  statsPeriodDayKey: string
}

/** Помидор в снимке + ключ дневной статистики и runId открытого сегмента. */
export type PomodoroSliceInFocusTools = PomodoroStateDto & { statsPeriodDayKey: string; currentRunId: string }

/** Полезная нагрузка снимка (внутри JSON-обёртки). */
export type FocusToolsStateData = {
  activeMode: HeaderWidgetMode
  pomodoro: PomodoroSliceInFocusTools
  timer: TimerToolSnapshot
  stopwatch: StopwatchToolSnapshot
}

export type TimerStateEnvelope = {
  type: typeof TIMER_STATE_ENVELOPE_TYPE
  schema: typeof TIMER_STATE_SCHEMA
  data: FocusToolsStateData
}

/** Ответ API и payload WebSocket (полный снимок + время сервера). */
export type FocusToolsFullStateDto = {
  state: FocusToolsStateData
  serverNowMs: number
}

export type FocusToolsSocketMessage =
  | { type: 'state-update'; data: FocusToolsFullStateDto }
  | { type: 'error'; data: { message: string } }

export function focusToolsSocketId(userId: string): string {
  return `assistant-focus-tools-${userId}`
}

/** Действия единого control API */
export type FocusToolsControlBody =
  | {
      statsDayKey?: string
      command:
        | { kind: 'pomodoro'; action: 'start' | 'resume' | 'pause' | 'stop' | 'skip' | 'reset' }
        | { kind: 'timer'; action: 'start' | 'resume' | 'pause' | 'reset' }
        | { kind: 'stopwatch'; action: 'start' | 'resume' | 'pause' | 'reset' }
        | { kind: 'widget-mode'; mode: HeaderWidgetMode }
        | { kind: 'save-pomodoro-settings'; settings: PomodoroSettingsInput }
        | { kind: 'assign-task'; taskId: string }
        | { kind: 'timer-settings'; minutes: number; seconds: number }
    }
  | Record<string, unknown>
