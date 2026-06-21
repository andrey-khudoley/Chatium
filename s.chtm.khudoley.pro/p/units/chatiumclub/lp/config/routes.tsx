// PROJECT_ROOT — путь от корня воркспэйса до проекта (от /)
export const PROJECT_ROOT = 'p/units/chatiumclub/lp'

// Базовый путь проекта для формирования ссылок (от корня, без домена)
const BASE_PATH = `/${PROJECT_ROOT}`

// Все маршруты внутри проекта задаются ОТНОСИТЕЛЬНО (через ./)
export const ROUTES = {
  index: './',
  apiSubmit: './api/submit'
} as const

/** Пути для getFullUrl (абсолютные от корня проекта, без домена). */
export const ROUTE_PATHS = {
  index: '/',
  apiSubmit: '/api/submit'
} as const

/**
 * Формирует путь от корня "/" через PROJECT_ROOT (без хардкода домена) — используется для ссылок,
 * которые попадают в браузер (Vue, fetch).
 */
export function getFullUrl(path: string): string {
  const clean = path.replace(/^\.\//, '').replace(/^\//, '')
  const normalized = clean ? `/${clean}` : '/'
  return `${BASE_PATH}${normalized}`
}

/** Префиксует относительный путь маршрутом проекта (для импорта роутов в других проектах). */
export function withProjectRoot(route: string): string {
  const clean = route.startsWith('./') ? route.slice(2) : route
  return `./${PROJECT_ROOT}/${clean}`
}
