export const PROJECT_ROOT = 'p/units/neso/bpm'

const BASE_PATH = `/${PROJECT_ROOT}`

export const ROUTES = {
  index: './',
  login: './web/login',
  admin: './web/admin',
  tests: './web/tests',
  design: './web/design',
  clientsDialogs: './web/clients/dialogs'
} as const

export function getDesignScenarioRoute(slug: string): string {
  return `./web/design/${slug}`
}

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
