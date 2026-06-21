// @shared

/**
 * Парсинг параметров из URL (между ? и #)
 */
export function parseUrlParams(url: string): Record<string, string> {
  if (!url) return {}

  try {
    // Извлекаем часть между ? и #
    const queryStart = url.indexOf('?')
    if (queryStart === -1) return {}

    const hashStart = url.indexOf('#', queryStart)
    const queryString =
      hashStart === -1 ? url.substring(queryStart + 1) : url.substring(queryStart + 1, hashStart)

    const params: Record<string, string> = {}
    const pairs = queryString.split('&')

    for (const pair of pairs) {
      if (!pair) continue
      const equalIndex = pair.indexOf('=')
      if (equalIndex === -1) {
        // Параметр без значения (?debug)
        const key = decodeURIComponent(pair)
        if (key) params[key] = ''
      } else {
        // Параметр со значением (?utm_source=google)
        const key = decodeURIComponent(pair.substring(0, equalIndex))
        const value = decodeURIComponent(pair.substring(equalIndex + 1))
        if (key) params[key] = value || ''
      }
    }

    return params
  } catch (error) {
    return {}
  }
}
