// @shared

/**
 * Утилита для генерации API URL
 * Работает как на сервере, так и на клиенте
 */

/**
 * Генерирует API URL относительно текущего пути
 * Использует относительные пути для работы в любом окружении
 */
export function useApiUrl(): { makeApiUrl: (endpoint: string) => string } {
  // На клиенте используем относительные пути от корня
  // Это работает корректно, так как приложение всегда развёрнуто в своей папке
  const makeApiUrl = (endpoint: string): string => {
    // Убираем начальный слеш если есть
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    // Используем относительный путь от корня приложения
    return `./api/${cleanEndpoint}`
  }

  return { makeApiUrl }
}

/**
 * Простая функция для генерации API URL без использования composable
 */
export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  return `./api/${cleanEndpoint}`
}
