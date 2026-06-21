import { Heap } from '@app/heap'

export const POMODORO_LAUNCH_SOURCES = [
  'start',
  'resume',
  'auto_next_phase',
  'task_changed',
  'continue',
  'skip',
  'tools_timer',
  'tools_stopwatch'
] as const
export type PomodoroLaunchSource = (typeof POMODORO_LAUNCH_SOURCES)[number]

export const POMODORO_LAUNCH_END_REASONS = [
  'pause',
  'stop',
  'restart',
  'phase_completed',
  'task_changed',
  'state_recovered',
  'phase_skip'
] as const
export type PomodoroLaunchEndReason = (typeof POMODORO_LAUNCH_END_REASONS)[number]

export const PomodoroLaunches = Heap.Table('t__assistant__pomodoro_launch__9Hk2tR', {
  userId: Heap.String({
    customMeta: { title: 'Владелец' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  startedAtMs: Heap.Number({ customMeta: { title: 'Старт сегмента (ms)' } }),
  endedAtMs: Heap.Optional(Heap.Number({ customMeta: { title: 'Завершение сегмента (ms)' } })),
  durationSec: Heap.Optional(Heap.Number({ customMeta: { title: 'Длительность (сек)' } })),
  phase: Heap.String({
    customMeta: { title: 'Фаза' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  taskId: Heap.Optional(Heap.String({ customMeta: { title: 'ID задачи' } })),
  cyclesCompletedAtStart: Heap.Number({ customMeta: { title: 'Циклов на старте сегмента' } }),
  source: Heap.String({
    customMeta: { title: 'Источник запуска' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  endReason: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Причина завершения сегмента' },
      searchable: { langs: ['ru', 'en'], embeddings: false }
    })
  ),
  tool: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Инструмент: pomodoro | timer | stopwatch' },
      searchable: { langs: ['ru', 'en'], embeddings: false }
    })
  ),
  runId: Heap.Optional(Heap.String({ customMeta: { title: 'ID непрерывного запуска (смена задачи — тот же runId)' } }))
})

export default PomodoroLaunches

export type PomodoroLaunchesRow = typeof PomodoroLaunches.T
export type PomodoroLaunchesRowJson = typeof PomodoroLaunches.JsonT
