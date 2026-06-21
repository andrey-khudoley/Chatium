// @shared
/**
 * Универсальная логика видимости пунктов навигации.
 * Используется для показа/скрытия разделов по роли или правам.
 */

import type { BpmNavChildConfig, BpmNavItemConfig } from './bpmNavConfig'

/** Контекст для проверки видимости (роль пользователя, права и т.д.). */
export interface NavVisibilityContext {
  /** Текущая роль пользователя (например 'admin', 'user', 'guest'). */
  userRole?: string
  /** Список прав для проверки (на будущее). */
  permissions?: string[]
}

/**
 * Проверяет, доступен ли пункт меню при заданном контексте.
 * Если у пункта указан requiredRole — он виден только при совпадении с context.userRole.
 * Пустой requiredRole — пункт виден всем.
 */
export function isNavItemVisible(
  item: BpmNavItemConfig | BpmNavChildConfig,
  context: NavVisibilityContext
): boolean {
  const role = 'requiredRole' in item ? item.requiredRole : undefined
  if (role == null || role === '') return true
  const userRole = context.userRole ?? ''
  return userRole === role
}

/** Результат фильтрации — пункт без полей видимости для передачи в UI. */
export interface VisibleNavChild {
  id: string
  label: string
  icon?: string
  badge?: number | string
}

export interface VisibleNavItem {
  id: string
  icon: string
  label: string
  badge?: number | string
  children?: VisibleNavChild[]
}

/**
 * Фильтрует конфиг навигации по контексту: убирает пункты и подпункты,
 * для которых isNavItemVisible возвращает false. Родитель скрывается,
 * если после фильтрации у него не осталось видимых детей.
 */
export function filterNavItems(
  items: BpmNavItemConfig[],
  context: NavVisibilityContext
): VisibleNavItem[] {
  const result: VisibleNavItem[] = []

  for (const item of items) {
    if (!isNavItemVisible(item, context)) continue

    if (!item.children?.length) {
      result.push({
        id: item.id,
        icon: item.icon,
        label: item.label,
        badge: item.badge
      })
      continue
    }

    const visibleChildren: VisibleNavChild[] = []
    for (const child of item.children) {
      if (!isNavItemVisible(child, context)) continue
      visibleChildren.push({
        id: child.id,
        label: child.label,
        icon: child.icon,
        badge: child.badge
      })
    }

    if (visibleChildren.length > 0) {
      result.push({
        id: item.id,
        icon: item.icon,
        label: item.label,
        badge: item.badge,
        children: visibleChildren
      })
    }
  }

  return result
}
