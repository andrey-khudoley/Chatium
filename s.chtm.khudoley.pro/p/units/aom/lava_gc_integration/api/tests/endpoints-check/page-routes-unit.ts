/**
 * Сервер-only: импорты `app.html` роутов с Vue — не помечать @shared-route.
 * Быстрые проверки: `route.run(ctx)` — хендлер выполняется, JSX/редирект возвращается (без HTTP).
 */
import { requireRealUser } from '@app/auth'
import { indexPageRoute } from '../../../index'
import { adminPageRoute } from '../../../web/admin/index'
import { profilePageRoute } from '../../../web/profile/index'
import { loginPageRoute } from '../../../web/login/index'
import { testsPageRoute } from '../../../web/tests/index'
import { ordersPageRoute } from '../../../web/orders/index'
import { PROJECT_ROOT } from '../../../shared/projectRoot'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/page-routes-unit'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

const BASE = `/${PROJECT_ROOT.replace(/^\/+/, '')}`

function pathToFakeUrl(pathSuffix: string): string {
  if (pathSuffix === '/' || pathSuffix === '') {
    return `${BASE}/`
  }
  return `${BASE}${pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`}`
}

function makeReq(url: string): app.Req {
  return {
    url,
    query: {},
    headers: {},
    method: 'get'
  } as app.Req
}

/** JSX-элемент html-jsx или ответ редиректа — считаем успешным рендером. */
function isAcceptableRouteResult(result: unknown): boolean {
  if (result === undefined || result === null) {
    return false
  }
  if (typeof result !== 'object') {
    return true
  }
  const o = result as Record<string, unknown>
  if ('type' in o) {
    return true
  }
  if ('statusCode' in o || 'headers' in o || 'body' in o) {
    return true
  }
  return Object.keys(o).length > 0
}

const PAGE_UNIT_TESTS: Array<{
  id: string
  title: string
  pathSuffix: string
  route: { run: (ctx: app.Ctx, req: app.Req) => Promise<unknown> }
}> = [
  { id: 'index', title: 'Главная (/)', pathSuffix: '/', route: indexPageRoute },
  { id: 'web-admin', title: 'Админка /web/admin', pathSuffix: '/web/admin', route: adminPageRoute },
  {
    id: 'web-profile',
    title: 'Профиль /web/profile',
    pathSuffix: '/web/profile',
    route: profilePageRoute
  },
  { id: 'web-login', title: 'Вход /web/login', pathSuffix: '/web/login', route: loginPageRoute },
  { id: 'web-tests', title: 'Тесты /web/tests', pathSuffix: '/web/tests', route: testsPageRoute },
  {
    id: 'web-orders',
    title: 'Заказы /web/orders',
    pathSuffix: '/web/orders',
    route: ordersPageRoute
  }
]

/**
 * GET /api/tests/endpoints-check/page-routes-unit
 * `route.run(ctx)` для каждой страницы — тот же ctx, что у запроса к API (сессия).
 * Query: testId — один маршрут.
 */
export const pageRoutesUnitTestRoute = app.get('/', async (ctx, req) => {
  requireRealUser(ctx)

  const testId =
    typeof req.query?.testId === 'string' && req.query.testId.trim()
      ? req.query.testId.trim()
      : null

  const tests = testId ? PAGE_UNIT_TESTS.filter((t) => t.id === testId) : PAGE_UNIT_TESTS
  if (testId && tests.length === 0) {
    return {
      success: false,
      test: 'page-routes-unit',
      error: `Неизвестный testId: ${testId}`,
      results: [] as TestResult[],
      at: Date.now()
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запуск unit page-routes`,
    payload: { testId, count: tests.length }
  })

  const results: TestResult[] = []

  for (const t of tests) {
    const url = pathToFakeUrl(t.pathSuffix)
    try {
      const result = await t.route.run(ctx, makeReq(url))
      const ok = isAcceptableRouteResult(result)
      await loggerLib.writeServerLog(ctx, {
        severity: 7,
        message: `[${LOG_PATH}] ${t.id} run`,
        payload: { url, ok, kind: typeof result }
      })
      results.push({
        id: t.id,
        title: t.title,
        passed: ok,
        error: ok ? undefined : 'Пустой или неожиданный ответ run()'
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] ${t.id} ошибка`,
        payload: { url, error: msg }
      })
      results.push({
        id: t.id,
        title: t.title,
        passed: false,
        error: msg
      })
    }
  }

  return { success: true, test: 'page-routes-unit', results, at: Date.now() }
})
