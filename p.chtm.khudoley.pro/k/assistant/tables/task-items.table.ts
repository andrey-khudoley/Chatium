import { Heap } from '@app/heap'

/** Статусы задачи */
export const TASK_STATUSES = ['todo', 'in_progress', 'done', 'cancelled'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

/**
 * Задачи внутри проекта.
 */
export const TaskItems = Heap.Table('t__assistant__task_item__2Vx8sT', {
  userId: Heap.String({
    customMeta: { title: 'Владелец' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  projectId: Heap.String({
    customMeta: { title: 'ID проекта' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  title: Heap.String({
    customMeta: { title: 'Заголовок' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  /** Текст «Детали» (форма задачи; в DTO дерева). */
  details: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Детали' },
      searchable: { langs: ['ru', 'en'], embeddings: false }
    })
  ),
  /** Служебное поле; не отдаётся в API клиенту. */
  context: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Контекст (служебное)' }
    })
  ),
  /** 1 — срочно, 4 — низкий */
  priority: Heap.Number({
    customMeta: { title: 'Приоритет (1–4)' }
  }),
  status: Heap.String({
    customMeta: { title: 'Статус' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  sortOrder: Heap.Number({
    customMeta: { title: 'Порядок в проекте' }
  }),
  /** Порядок в дневном списке (задачи «В работе» на вкладке «День» журнала) */
  daySortOrder: Heap.Number({
    customMeta: { title: 'Порядок в дневном списке' }
  }),
  /** Накопленное время в работе Pomodoro, секунды */
  pomodoroWorkSec: Heap.Number({
    customMeta: { title: 'Pomodoro работа (сек)' }
  }),
  /** Накопленное время в отдыхе Pomodoro, секунды */
  pomodoroRestSec: Heap.Number({
    customMeta: { title: 'Pomodoro отдых (сек)' }
  }),
  /** Дата/время события задачи (unix ms) */
  eventAtMs: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'Дата/время события (ms)' }
    })
  ),
  /** Напомнить за N минут до события */
  reminderMinutesBefore: Heap.Number({
    customMeta: { title: 'Напоминание за (мин)' }
  })
})

export default TaskItems

export type TaskItemsRow = typeof TaskItems.T
export type TaskItemsRowJson = typeof TaskItems.JsonT
