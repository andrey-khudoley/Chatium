// PROJECT_ROOT — путь от корня воркспэйса до проекта (от /)
export const PROJECT_ROOT = 'p/units/chatiumclub/client4'

// Базовый путь проекта для формирования ссылок (от корня, без домена)
const BASE_PATH = `/${PROJECT_ROOT}`

// Все маршруты внутри проекта задаются ОТНОСИТЕЛЬНО (через ./)
export const ROUTES = {
  index: './',
  admin: './web/admin',
  profile: './web/profile',
  login: './web/login',
  tests: './web/tests'
} as const

/** Пути для getFullUrl (абсолютные от корня проекта) */
export const ROUTE_PATHS = {
  index: '/',
  admin: '/web/admin',
  profile: '/web/profile',
  login: '/web/login',
  tests: '/web/tests'
} as const

/**
 * Формирует путь для передачи на фронтенд (Vue компоненты, ссылки).
 * От корня "/" через PROJECT_ROOT, без хардкода домена.
 */
export function getFullUrl(path: string): string {
  const clean = path.replace(/^\.\//, '').replace(/^\//, '')
  const normalized = clean ? `/${clean}` : '/'
  return `${BASE_PATH}${normalized}`
}

export function withProjectRoot(route: string): string {
  const clean = route.startsWith('./') ? route.slice(2) : route
  return `./${PROJECT_ROOT}/${clean}`
}

export function withProjectRootAndSubroute(route: string, subroute?: string): string {
  if (!subroute || subroute === '/') return withProjectRoot(route)
  const clean = subroute.startsWith('/') ? subroute.slice(1) : subroute
  return `${withProjectRoot(route)}~${clean}`
}
