// @shared

/**
 * Утилиты для работы с путями приложения
 * Обеспечивают переносимость при развёртывании в разных окружениях
 */

/**
 * Получает базовый путь приложения из контекста запроса
 * Используется на бэкенде для генерации корректных URL
 *
 * Поддерживает пути:
 * - /p/saas/chat → /p/saas/chat
 * - /inner/project → /inner/project
 * - /project-chat → /project-chat
 */
export function getAppBasePath(ctx: {
  req: { url?: string; headers?: Record<string, string> }
}): string {
  const reqUrl = ctx.req.url || ''

  // Специальные односегментные пути (старые проекты)
  const singleSegmentPaths = ['/project-chat', '/projekt-chat']
  for (const path of singleSegmentPaths) {
    if (reqUrl === path || reqUrl.startsWith(`${path}/`)) {
      return path
    }
  }

  // Многосегментные пути: /p/saas/chat, /inner/project и т.д.
  // Находим первые 3 сегмента пути
  const pathSegments = reqUrl.split('/').filter(Boolean)

  // Для путей типа /p/saas/chat → берем первые 3 сегмента
  if (pathSegments.length >= 3 && pathSegments[0] === 'p') {
    return `/${pathSegments[0]}/${pathSegments[1]}/${pathSegments[2]}`
  }

  // Для путей типа /inner/project → берем первые 2 сегмента
  if (pathSegments.length >= 2 && ['inner', '.deprecated'].includes(pathSegments[0])) {
    return `/${pathSegments[0]}/${pathSegments[1]}`
  }

  // Fallback: используем реферер для определения пути
  const referer = ctx.req.headers?.referer
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      const refererPath = refererUrl.pathname

      // Проверяем односегментные пути
      for (const path of singleSegmentPaths) {
        if (refererPath === path || refererPath.startsWith(`${path}/`)) {
          return path
        }
      }

      // Парсим многосегментные пути из реферера
      const refSegments = refererPath.split('/').filter(Boolean)
      if (refSegments.length >= 3 && refSegments[0] === 'p') {
        return `/${refSegments[0]}/${refSegments[1]}/${refSegments[2]}`
      }
      if (refSegments.length >= 2 && ['inner', '.deprecated'].includes(refSegments[0])) {
        return `/${refSegments[0]}/${refSegments[1]}`
      }
    } catch {
      // Игнорируем ошибки парсинга URL
    }
  }

  // Fallback: возвращаем пустую строку (относительные пути)
  return ''
}

/**
 * Генерирует полный URL для приложения
 */
export function getAppUrl(
  ctx: { req: { url?: string; headers?: Record<string, string> } },
  path: string = ''
): string {
  const basePath = getAppBasePath(ctx)
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${basePath}${cleanPath}`
}

/**
 * Получает origin (protocol + host) из контекста запроса
 */
export function getOrigin(ctx: { req: { headers?: Record<string, string> } }): string {
  const origin = ctx.req.headers?.origin
  if (origin) return origin

  const host = ctx.req.headers?.host
  if (host) return `https://${host}`

  // Fallback
  return ''
}

/**
 * Генерирует полный внешний URL (с origin)
 */
export function getFullUrl(
  ctx: { req: { url?: string; headers?: Record<string, string> } },
  path: string = ''
): string {
  const origin = getOrigin(ctx)
  const appUrl = getAppUrl(ctx, path)
  return `${origin}${appUrl}`
}
