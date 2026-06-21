// @shared
// Клиентские обёртки для API настроек через fetch()

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

export const getSettingRoute = {
  query(params: { key: string }) {
    return {
      run(_ctx: any) {
        return fetch(buildUrl('api/settings/get', params), { credentials: 'same-origin' }).then(r => r.json())
      }
    }
  }
}

export const saveSettingRoute = {
  run(_ctx: any, body: { key: string; value: unknown }) {
    return fetch(buildUrl('api/settings/save'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json())
  }
}
