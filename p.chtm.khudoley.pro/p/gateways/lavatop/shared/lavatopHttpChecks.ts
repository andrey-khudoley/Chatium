// @shared
/**
 * Лавтоп-специфичные данные/проверки HTTP-страниц для вкладки тестов: маршруты,
 * минимальные SSR-фрагменты и предикат прохождения. Вынесено из useTestSuites
 * ради лимита размера файла; поведение идентично исходному pages/TestsPage.vue.
 */

export const HTTP_PATH_BY_TEST_ID: Record<string, string> = {
  index: '/',
  'web-admin': '/web/admin',
  'web-profile': '/web/profile',
  'web-login': '/web/login',
  'web-tests': '/web/tests'
}

/** Минимальные фрагменты SSR для проверки (п. 6 плана). */
export const HTTP_HTML_SNIPPETS: Record<string, string[]> = {
  index: ['window.__BOOT__', 'Шаблон проекта'],
  'web-admin': ['window.__BOOT__', 'Админка'],
  'web-profile': ['window.__BOOT__', 'Профиль'],
  'web-login': ['Вход'],
  /** Не «Юнит» из вкладок: в ответе может быть только head + boot, без полного тела до гидрации. См. meta в web/tests/index.tsx */
  'web-tests': ['window.__BOOT__', 'saas-gw-lavatop-page']
}

export function httpPagePassed(
  testId: string,
  res: Response,
  html: string
): { ok: boolean; error?: string } {
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
  const finalUrl = res.url || ''
  if (testId === 'web-admin') {
    if (finalUrl.includes('/web/admin')) {
      const ok = html.includes('__BOOT__') && html.includes('Админка')
      return ok ? { ok: true } : { ok: false, error: 'нет SSR админки' }
    }
    const ok = html.includes('Вход') || html.includes('Перенаправление')
    return ok ? { ok: true } : { ok: false, error: 'ожидался редирект на вход' }
  }
  if (testId === 'web-profile') {
    if (finalUrl.includes('/web/profile')) {
      const ok = html.includes('__BOOT__') && html.includes('Профиль')
      return ok ? { ok: true } : { ok: false, error: 'нет SSR профиля' }
    }
    const ok = html.includes('Вход') || html.includes('login')
    return ok ? { ok: true } : { ok: false, error: 'ожидался редирект на вход' }
  }
  const need = HTTP_HTML_SNIPPETS[testId]
  if (!need?.length) return { ok: true }
  for (const s of need) {
    if (!html.includes(s)) return { ok: false, error: `нет фрагмента: ${s.slice(0, 40)}…` }
  }
  return { ok: true }
}

/** Базовый URL API проекта по indexUrl/projectRoot (общий для прогона HTTP-проверок). */
export function getApiBaseUrl(indexUrl: string, projectRoot: string): string {
  const path = indexUrl.startsWith('http') ? new URL(indexUrl).pathname : indexUrl
  const basePath = path.replace(/\/$/, '') || `/${projectRoot}`
  const origin = indexUrl.startsWith('http') ? new URL(indexUrl).origin : window.location.origin
  return `${origin}${basePath.startsWith('/') ? basePath : '/' + basePath}`
}
