// PROJECT_ROOT — путь от корня воркспэйса до проекта (от /)
export const PROJECT_ROOT = 'k/assistant'

// Базовый путь проекта для формирования ссылок (от корня, без домена)
const BASE_PATH = `/${PROJECT_ROOT}`

// Все маршруты внутри проекта задаются ОТНОСИТЕЛЬНО (через ./)
export const ROUTES = {
  index: './',
  admin: './web/admin',
  profile: './web/profile',
  login: './web/login',
  tests: './web/tests',
  journal: './web/journal',
  tasks: './web/tasks',
  tools: './web/tools',
  pomodoro: './web/timers'
} as const

/** Пути для getFullUrl (абсолютные от корня проекта) */
export const ROUTE_PATHS = {
  index: '/',
  admin: '/web/admin',
  profile: '/web/profile',
  login: '/web/login',
  tests: '/web/tests',
  journal: '/web/journal',
  tasks: '/web/tasks',
  tools: '/web/tools',
  pomodoro: '/web/timers'
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

/**
 * Путь для `fetch` из браузера к API-роуту этого проекта.
 * `route.url()` в Chatium может вернуть относительный путь (`./api/...`) или полный URL с доменом.
 * Для абсолютного URL нельзя вызывать `withProjectRoot` — получится `p/assistant/.../https://...` и 404.
 */
export function getApiUrlForRoute(routeUrl: string): string {
  const raw = routeUrl.trim()
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const u = new URL(raw)
      return u.pathname + u.search
    } catch {
      return getFullUrl(raw)
    }
  }
  return getFullUrl(raw)
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
