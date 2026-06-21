// @shared
// Клиентские обёртки для API темы через fetch()

const API_BASE_PATH = '/k/shared'

function getBase(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin + API_BASE_PATH
}

function buildUrl(path: string, query?: Record<string, string>): string {
  const url = `${getBase()}/${path}`
  if (query && Object.keys(query).length > 0) {
    return `${url}?${new URLSearchParams(query).toString()}`
  }
  return url
}

export const getDefaultThemeRoute = {
  run(_ctx: any) {
    return fetch(buildUrl('api/theme/get'), { credentials: 'same-origin' }).then(r => r.json())
  }
}

export const saveDefaultThemeRoute = {
  run(_ctx: any, body: { theme: 'light' | 'dark' }) {
    return fetch(buildUrl('api/theme/save'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json())
  }
}
