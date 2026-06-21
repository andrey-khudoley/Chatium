/** DTO для UI и API задач (без зависимостей от Heap — безопасно для Vue). */

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'

export type TaskClientDto = { id: string; name: string; sortOrder: number }

export type TaskProjectDto = {
  id: string
  clientId: string
  name: string
  /** Текст «Детали»; пустая строка, если не задано. */
  details: string
  /** Служебный контекст для AI; пустая строка, если не задано. */
  context: string
  sortOrder: number
}

export type TaskItemDto = {
  id: string
  projectId: string
  title: string
  /** Текст «Детали»; пустая строка, если не задано. */
  details: string
  /** Служебный контекст для AI; пустая строка, если не задано. */
  context: string
  priority: number
  status: TaskStatus
  sortOrder: number
  /** Порядок среди задач со статусом «В работе» (вкладка «День» журнала) */
  daySortOrder: number
  /** Накопленное время Pomodoro в работе, секунды */
  pomodoroWorkSec: number
  /** Накопленное время Pomodoro в отдыхе, секунды */
  pomodoroRestSec: number
  /** Дата/время события (unix ms), если для задачи задано событие */
  eventAtMs: number | null
  /** За сколько минут до события напоминать в браузере */
  reminderMinutesBefore: number
}

export type TasksTreeDto = {
  clients: TaskClientDto[]
  projects: TaskProjectDto[]
  tasks: TaskItemDto[]
}
