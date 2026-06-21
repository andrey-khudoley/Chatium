/**
 * URL-константы для роутов проекта.
 *
 * КРИТИЧЕСКИ ВАЖНО: Этот файл ОБЯЗАТЕЛЕН в каждом проекте!
 * Используется для избежания циклических зависимостей между роутами
 * и для формирования полных URL без хардкода.
 */

/**
 * Домен проекта (без протокола)
 */
export const DOMAIN = 's.chtm.aley.pro'

/**
 * Базовый путь проекта от корня workspace
 */
export const PROJECT_ROOT = '/inner/samples/new_project'

/**
 * Полный базовый URL проекта
 */
export const BASE_URL = `https://${DOMAIN}${PROJECT_ROOT}`

/**
 * Пути внутри проекта (от корня проекта)
 * ⚠️ ВАЖНО: Эти пути используются ТОЛЬКО для формирования полных URL через getFullUrl()
 *
 * ❌ НЕ используйте эти пути для серверных редиректов напрямую!
 * ✅ Для серверных редиректов используйте относительные пути: './path', '../path'
 */
export const ROUTES = {
  index: '/',
  admin: '/admin',
  profile: '/profile',
  login: '/login',
  tests: '/tests',
  testsAi: '/tests/ai'
} as const

/**
 * Функция для формирования полного URL
 *
 * ✅ ИСПОЛЬЗУЙТЕ ТОЛЬКО для передачи URL на фронтенд (в Vue компоненты, JSON API)
 * ❌ НЕ используйте для серверных редиректов! Используйте относительные пути: './path', '../path'
 *
 * @example
 * // ✅ ПРАВИЛЬНО - передача на фронтенд
 * // admin.tsx
 * import { getFullUrl, ROUTES } from '../config/routes'
 * return <AdminPage indexUrl={getFullUrl(ROUTES.index)} />
 *
 * @example
 * // ❌ НЕПРАВИЛЬНО - серверный редирект
 * return ctx.resp.redirect(getFullUrl(ROUTES.login))  // Это полный URL с доменом!
 *
 * @example
 * // ✅ ПРАВИЛЬНО - серверный редирект с относительным путём
 * return ctx.resp.redirect('../login')
 */
export function getFullUrl(path: string): string {
  return `${BASE_URL}${path}`
}
