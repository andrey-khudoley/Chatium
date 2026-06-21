// @shared
import { getAllEvents } from '../../shared/eventTypes'

/**
 * Построение SQL условий для фильтрации событий
 */
export function buildEventFilterConditions(eventTypesFilter: string[]): string {
  // Если фильтр пустой - показываем ВСЁ (без фильтрации)
  // Это намного быстрее, чем создавать 79 условий через OR
  if (eventTypesFilter.length === 0) {
    return '1 = 1'
  }

  // Получаем все определения событий для построения условий
  const allEventDefinitions = getAllEvents()

  // Строим условие для фильтрации событий
  const actionConditions: string[] = []

  for (const eventTypeName of eventTypesFilter) {
    const eventDef = allEventDefinitions.find((e) => e.name === eventTypeName)

    if (!eventDef) {
      // Если определение не найдено - пропускаем
      continue
    }

    if (eventDef.urlPattern) {
      // Для паттернов используем LIKE
      const likePattern = eventDef.urlPattern.replace(/'/g, "''").replace(/%/g, '%')
      actionConditions.push(`urlPath LIKE '${likePattern}'`)
    } else if (eventDef.urlPath) {
      // Для точных путей используем = (с экранированием одинарных кавычек)
      const escapedUrlPath = eventDef.urlPath.replace(/'/g, "''")
      actionConditions.push(`urlPath = '${escapedUrlPath}'`)
    } else if (eventDef.type === 'traffic') {
      // Для HTTP событий (traffic)
      if (eventDef.name === 'pageview') {
        // Pageview - это только HTTP/HTTPS события
        actionConditions.push(`startsWith(urlPath, 'http')`)
      } else {
        // Экранируем имя действия
        const escapedAction = eventDef.name.replace(/'/g, "''")
        actionConditions.push(`action = '${escapedAction}'`)
      }
    }
  }

  // Если нет ни одного условия - возвращаем условие, которое ничего не найдет
  if (actionConditions.length === 0) {
    return '1 = 0'
  }

  // Объединяем условия через OR
  return actionConditions.join(' OR ')
}
