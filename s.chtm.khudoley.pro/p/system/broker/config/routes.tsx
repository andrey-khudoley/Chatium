// Домен воркспейса — нужен для построения полных внешних HTTP-URL: реальная
// параллельность в конкурентных тестах (§5.9.2 О3) бьёт по внешним HTTP-роутам,
// а не вызывает логику внутри одного процесса — иначе гонки не возникло бы.
export const DOMAIN = 's.chtm.khudoley.pro'

// PROJECT_ROOT — путь от корня воркспейса до этой копии проекта (без ведущего слеша).
// prod-копия (эта) — окружение prod (§3 «Окружения»); правится только при переносе
// кода между копиями (единственный правимый файл переноса, 006-arch; §0 корневого
// CLAUDE.md), не здесь.
export const PROJECT_ROOT = 'p/system/broker'

const BASE_PATH = `/${PROJECT_ROOT}`

// Маршруты — ОТНОСИТЕЛЬНО (через ./), по образцу p/template_project/config/routes.tsx
export const ROUTES = {
  index: './',
  tests: './web/tests',
  testsAi: './web/tests/ai',
  admin: './web/admin'
} as const

/** Абсолютные (от корня проекта) пути — для справки/консистентности с шаблоном. */
export const ROUTE_PATHS = {
  index: '/',
  tests: '/web/tests',
  testsAi: '/web/tests/ai',
  admin: '/web/admin'
} as const

/**
 * Формирует путь для передачи на фронтенд (Vue-компоненты, ссылки).
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
