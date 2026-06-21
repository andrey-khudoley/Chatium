// @shared

/**
 * Утилиты для работы с ID пользователей
 *
 * Предоставляет функции для безопасного сравнения и нормализации ID пользователей,
 * учитывающие возможные различия в типах данных (string, number, UUID объекты и т.д.)
 */

/**
 * Нормализует ID пользователя к строке
 * @param id - ID пользователя любого типа
 * @returns Нормализованная строка или null, если ID невалиден
 */
export const normalizeUserId = (id: any): string | null => {
  if (id === null || id === undefined) return null
  const normalized = String(id).trim()
  return normalized || null
}

/**
 * Проверяет, совпадают ли два ID пользователя
 * @param id1 - Первый ID пользователя
 * @param id2 - Второй ID пользователя
 * @returns true, если ID совпадают (после нормализации), иначе false
 */
export const userIdsMatch = (id1: any, id2: any): boolean => {
  const normalized1 = normalizeUserId(id1)
  const normalized2 = normalizeUserId(id2)
  return normalized1 !== null && normalized2 !== null && normalized1 === normalized2
}
