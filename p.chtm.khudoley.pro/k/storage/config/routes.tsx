// @shared
// PROJECT_ROOT — путь от корня воркспэйса до проекта (от /)
export const PROJECT_ROOT = 'p/kht/storage'

// Базовый путь проекта для формирования ссылок (от корня, без домена)
const BASE_PATH = `/${PROJECT_ROOT}`

// Все маршруты внутри проекта задаются ОТНОСИТЕЛЬНО (через ./). Путь в файле всегда '/' — без тильды в URL.
export const ROUTES = {
  index: './',
  serve: './api/scripts/serve',
  ui: './web/ui',
  tests: './web/tests',
  testsAi: './web/tests/ai'
} as const

/** Пути для getFullUrl (абсолютные от корня проекта) */
export const ROUTE_PATHS = {
  index: '/',
  serve: '/api/scripts/serve',
  ui: '/web/ui',
  tests: '/web/tests',
  testsAi: '/web/tests/ai'
} as const

/**
 * Формирует путь для передачи на фронтенд (Vue, ссылки).
 * От корня "/" через PROJECT_ROOT, без хардкода домена.
 */
export function getFullUrl(path: string): string {
  const clean = path.replace(/^\.\//, '').replace(/^\//, '')
  const normalized = clean ? `/${clean}` : '/'
  return `${BASE_PATH}${normalized}`
}

/** Для передачи пути на клиент при циклических зависимостях (без домена). */
export function withProjectRoot(route: string): string {
  const clean = route.startsWith('./') ? route.slice(2) : route.replace(/^\/+/, '')
  return `./${PROJECT_ROOT}/${clean}`
}
