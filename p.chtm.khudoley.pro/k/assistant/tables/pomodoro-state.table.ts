// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TAssistantPomodoroState6Gs2mQ = Heap.Table(
  't__assistant__pomodoro_state__6Gs2mQ',
  {
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'Владелец' } })),
    status: Heap.Optional(Heap.String({ customMeta: { title: 'Статус' } })),
    phase: Heap.Optional(Heap.String({ customMeta: { title: 'Фаза' } })),
    currentTaskId: Heap.Optional(Heap.String({ customMeta: { title: 'ID текущей задачи' } })),
    phaseEndsAtMs: Heap.Optional(Heap.Number({ customMeta: { title: 'Конец текущей фазы (ms)' } })),
    phaseRemainingSec: Heap.Optional(Heap.Number({ customMeta: { title: 'Остаток в paused/stopped (сек)' } })),
    cyclesCompleted: Heap.Optional(Heap.Number({ customMeta: { title: 'Завершено рабочих циклов' } })),
    totalWorkSec: Heap.Optional(Heap.Number({ customMeta: { title: 'Сумма работы (сек)' } })),
    totalRestSec: Heap.Optional(Heap.Number({ customMeta: { title: 'Сумма отдыха (сек)' } })),
    workMinutes: Heap.Optional(Heap.Number({ customMeta: { title: 'Минут работы' } })),
    restMinutes: Heap.Optional(Heap.Number({ customMeta: { title: 'Минут отдыха' } })),
    longRestMinutes: Heap.Optional(Heap.Number({ customMeta: { title: 'Минут длинного отдыха' } })),
    cyclesUntilLongRest: Heap.Optional(Heap.Number({ customMeta: { title: 'Циклов до длинного отдыха' } })),
    pauseAfterWork: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Пауза после работы' } })),
    pauseAfterRest: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Пауза после отдыха' } })),
    afterLongRest: Heap.Optional(Heap.String({ customMeta: { title: 'После длинного отдыха' } })),
    updatedAtMs: Heap.Optional(Heap.Number({ customMeta: { title: 'Последнее обновление (ms)' } })),
    autoStartRest: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Автостарт отдыха' } })),
    autoStartNextCycle: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Автостарт следующего цикла' } })),
    phaseChangeSound: Heap.Optional(Heap.Number({ customMeta: { title: 'Звук смены фазы (1–5)' } })),
    tasksCompletedToday: Heap.Optional(Heap.Number({ customMeta: { title: 'Задач завершено сегодня' } })),
    statsPeriodDayKey: Heap.Optional(
      Heap.String({ customMeta: { title: 'Ключ периода дневной статистики (YYYY-MM-DD, полночь по UTC+N из профиля)' } }),
    ),
  },
  { customMeta: { title: 'pomodoro-state.table.ts', description: '' } },
)

export default TAssistantPomodoroState6Gs2mQ

export type TAssistantPomodoroState6Gs2mQRow = typeof TAssistantPomodoroState6Gs2mQ.T
export type TAssistantPomodoroState6Gs2mQRowJson = typeof TAssistantPomodoroState6Gs2mQ.JsonT
