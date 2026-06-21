import { Heap } from '@app/heap'

/**
 * Таблица для хранения настроек проекта
 *
 * Используется для глобальных настроек проекта, таких как:
 * - log_prefix: префикс для логирования (например: "[PROJECT]")
 * - log_level: уровень логирования (info | warn | error)
 * - project_name: название проекта
 * - project_description: описание проекта
 *
 * Формат: ключ-значение
 *
 * ВАЖНО: Этот файл содержит ТОЛЬКО определение таблицы.
 * Не добавляйте сюда импорты Debug, логгеров или других модулей.
 * Вспомогательные функции должны быть в отдельных файлах (см. lib/settings-init.ts)
 */
export const ProjectSettings = Heap.Table('t__project__settings__a1b2c3d4', {
  key: Heap.String({
    customMeta: { title: 'Ключ настройки' }
  }),
  value: Heap.Any({
    customMeta: { title: 'Значение настройки' }
  })
})

export default ProjectSettings
