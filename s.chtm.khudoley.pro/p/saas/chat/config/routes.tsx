/**
 * Конфигурация маршрутов проекта Chat (file-based роутинг).
 * PROJECT_ROOT — путь от корня воркспэйса до проекта (без ведущего слэша).
 */
export const PROJECT_ROOT = 'p/saas/chat'

const BASE_PATH = `/${PROJECT_ROOT}`

export const ROUTES = {
  index: './',
  invite: './web/invite',
  adminLogs: './web/admin/logs',
  apiStylesTheme: './api/styles/theme',
  apiStylesChatView: './api/styles/chat-view',
  apiStylesMessageSelection: './api/styles/message-selection',
  apiManifest: './api/manifest'
} as const

/**
 * Формирует путь для ссылок (от корня проекта).
 * Использовать для withProjectRoot(route.url()) при передаче на фронтенд.
 */
export function withProjectRoot(route: string): string {
  const clean = route.startsWith('./') ? route.slice(2) : route
  return `./${PROJECT_ROOT}/${clean}`
}

export function withProjectRootAndSubroute(route: string, subroute?: string): string {
  if (!subroute || subroute === '/') return withProjectRoot(route)
  const clean = subroute.startsWith('/') ? subroute.slice(1) : subroute
  return `${withProjectRoot(route)}~${clean}`
}

/** Абсолютный путь от корня (для getAppUrl и т.п.) */
export function getFullUrl(path: string): string {
  const clean = path.replace(/^\.\//, '').replace(/^\//, '')
  const normalized = clean ? `/${clean}` : '/'
  return `${BASE_PATH}${normalized}`
}
