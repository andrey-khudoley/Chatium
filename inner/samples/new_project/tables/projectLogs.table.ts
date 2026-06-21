import { Heap } from '@app/heap'

/**
 * Таблица для хранения логов проекта
 *
 * Каждая запись содержит:
 * - level: уровень логирования (info | warn | error)
 * - message: сообщение лога
 * - code: код ошибки (опционально)
 *
 * Системные поля createdAt и updatedAt добавляются автоматически.
 */
export const ProjectLogs = Heap.Table('t__project__logs__x1y2z3w4', {
  level: Heap.String({
    customMeta: { title: 'Уровень' }
  }),
  message: Heap.String({
    customMeta: { title: 'Сообщение' }
  }),
  code: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Код ошибки' }
    })
  )
})

export default ProjectLogs
