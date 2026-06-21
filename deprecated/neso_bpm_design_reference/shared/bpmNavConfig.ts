// @shared
/**
 * Конфигурация пунктов сайдбара BPM.
 * Единая точка редактирования списка навигации; видимость пунктов
 * управляется через shared/navVisibility.ts (например, по роли пользователя).
 */

export interface BpmNavChildConfig {
  id: string
  label: string
  icon?: string
  badge?: number | string
  /** Роль, при которой пункт виден (см. navVisibility). Пусто = виден всем. */
  requiredRole?: string
}

export interface BpmNavItemConfig {
  id: string
  icon: string
  label: string
  badge?: number | string
  /** Роль, при которой пункт/раздел виден. Пусто = виден всем. */
  requiredRole?: string
  children?: BpmNavChildConfig[]
}

/** Полный перечень пунктов главного меню BPM (главная, админка и подпункты). */
export const BPM_HOME_NAV_ITEMS: BpmNavItemConfig[] = [
  {
    id: 'home',
    icon: 'fa-house',
    label: 'Главная'
  },
  {
    id: 'clients',
    icon: 'fa-users',
    label: 'Клиенты',
    children: [{ id: 'client-dialogs', label: 'Диалоги', icon: 'fa-comments' }]
  },
  {
    id: 'admin',
    icon: 'fa-gear',
    label: 'Админка',
    requiredRole: 'admin',
    children: [
      { id: 'admin-panel', label: 'Панель', icon: 'fa-th-large' },
      { id: 'admin-tests', label: 'Тесты', icon: 'fa-flask' },
      { id: 'admin-design', label: 'Design', icon: 'fa-palette', badge: 0 }
    ]
  }
]
