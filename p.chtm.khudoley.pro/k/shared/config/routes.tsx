/**
 * Конфигурация маршрутов проекта Knowledge.
 * PROJECT_ROOT — путь от корня воркспейса до модуля.
 */
export const PROJECT_ROOT = 'p/docs/knowledge'

const BASE_PATH = `/${PROJECT_ROOT}`

/**
 * Путь для ссылок (от корня, без домена).
 */
export function getFullUrl(path: string): string {
  const clean = path.replace(/^\.\//, '').replace(/^\//, '')
  const normalized = clean ? `/${clean}` : '/'
  return `${BASE_PATH}${normalized}`
}

/**
 * Префикс для относительных путей (./p/docs/knowledge/...).
 */
export function withProjectRoot(route: string): string {
  const clean = route.startsWith('./') ? route.slice(2) : route
  return `./${PROJECT_ROOT}/${clean}`
}
