// @shared
// Клиентские обёртки для вызова API через fetch(). Тот же интерфейс .run() / .query().run(),
// чтобы во Vue вызывать роуты как обычно, без импорта серверных @shared-route модулей.
// Базовый путь — корень модуля. Должен совпадать с URL, по которому открывается приложение (например /p/docs).

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

export const listDocsRoute = {
  query(params: Record<string, string>) {
    return {
      run(_ctx: any) {
        return fetch(buildUrl('api/docs/list', params), { credentials: 'same-origin' }).then(r => r.json())
      }
    }
  }
}

export const listSharedDocsRoute = {
  query(params: Record<string, string>) {
    return {
      run(_ctx: any) {
        return fetch(buildUrl('api/docs/list-shared', params), { credentials: 'same-origin' }).then(r => r.json())
      }
    }
  }
}

export const getDocRoute = {
  query(params: { filename: string; download?: boolean }) {
    const q: Record<string, string> = { f: params.filename }
    if (params.download) q.download = 'true'
    return {
      run(_ctx: any) {
        return fetch(buildUrl('api/docs/get', q), { credentials: 'same-origin' }).then(r => r.json())
      }
    }
  }
}

export const putDocRoute = {
  run(_ctx: any, body: { filename: string; markdown: string }) {
    return fetch(buildUrl('api/docs/put'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json())
  }
}

export const deleteDocRoute = {
  run(_ctx: any, body: { filename: string }) {
    return fetch(buildUrl('api/docs/delete'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json())
  }
}
