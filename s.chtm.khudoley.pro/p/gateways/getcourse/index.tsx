import { jsx } from '@app/html-jsx'
import { requireRealUser } from '@app/auth'
import HomePage from './pages/HomePage.vue'
import { getPreloaderStyles, getPreloaderScript } from './lib/preloader'
import { crtBackgroundStyles, customScrollbarStyles } from './styles'
import { gcHeaderCss1 } from './pagecss/gcHeaderCss1'
import { gcHeaderCss2 } from './pagecss/gcHeaderCss2'
import { gcHomeCss1 } from './pagecss/gcHomeCss1'
import { gcHomeCss2 } from './pagecss/gcHomeCss2'
import { gcHomeCss3 } from './pagecss/gcHomeCss3'
import { requestTestTabStyles } from './styles.requestTest'
import { getLogLevelForPage, getLogLevelScript } from './lib/logLevel'
import { getFullUrl, ROUTES, ROUTE_PATHS, PROJECT_ROOT } from './config/routes'
import {
  requireInternalAccess,
  InternalAccessDeniedError
} from './lib/access/requireInternalAccess'
import { getPageTitle, getHeaderText } from './config/project'
import * as loggerLib from './lib/logger.lib'
import * as settingsLib from './lib/settings.lib'
import { htmlRedirect } from './lib/htmlRedirect'
import { toOperationSummaries } from './lib/gateway/operationsCatalog'
import { GC_TEST_SCHOOL_API_KEY, GC_TEST_SCHOOL_HOST } from './shared/gatewaySettingKeys'

const PANEL_PAGE_NAME = 'Панель'

const LOG_PATH = 'index'

export const indexPageRoute = app.html('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Рендер главной страницы`,
    payload: { hasUser: !!ctx.user, isAdmin: ctx.user?.is?.('Admin') ?? false }
  })

  // Главная gateway — это панель. Доступ: requireRealUser + requireInternalAccess.
  // Анонимный → на вход; авторизованный без гранта → /web/forbidden.
  try {
    requireRealUser(ctx)
    await requireInternalAccess(ctx)
  } catch (err) {
    if (err instanceof InternalAccessDeniedError) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] forbidden_redirect`,
        payload: { userId: ctx.user?.id ?? null }
      })
      return htmlRedirect(ctx, getFullUrl(ROUTE_PATHS.forbidden))
    }
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] signin_redirect`,
      payload: { backUrl: req.url }
    })
    return htmlRedirect(ctx, `/s/auth/signin?back=${encodeURIComponent(req.url)}`)
  }

  const isAdmin = ctx.user?.is('Admin') ?? false
  const loginUrl = getFullUrl(ROUTES.login)
  const adminUrl = isAdmin ? getFullUrl(ROUTES.admin) : ''
  // Тесты доступны только роли Admin — ссылку в шапке показываем лишь админу.
  const testsUrl = isAdmin ? getFullUrl(ROUTES.tests) : ''
  const indexUrl = getFullUrl(ROUTES.index)
  const profileUrl = getFullUrl(ROUTES.profile)

  // Глобальный фильтр панели по дате/времени (Unix ms). Читается из Heap на SSR.
  const initialDateFilter = await settingsLib.getPanelDateFilter(ctx)

  const apiUrls = {
    recentRequests: getFullUrl('/api/admin/raw/requests/recent'),
    recentUpstream: getFullUrl('/api/admin/raw/upstream/recent'),
    rawRequest: getFullUrl('/api/admin/raw/requests/get'),
    rawUpstream: getFullUrl('/api/admin/raw/upstream/get'),
    counts: getFullUrl('/api/admin/dashboard/gatewayCounts'),
    filterSave: getFullUrl('/api/admin/analytics/filter-save'),
    accessGenerateInvite: getFullUrl('/api/access/generate-invite'),
    accessRevokeInvite: getFullUrl('/api/access/revoke-invite'),
    accessRevokeGrant: getFullUrl('/api/access/revoke-grant'),
    accessInvites: getFullUrl('/api/access/invites'),
    accessGrants: getFullUrl('/api/access/grants')
  }

  const logLevel = await getLogLevelForPage(ctx)
  const projectName = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)

  // Каталог операций и тестовые значения для вкладки «Создать запрос».
  // ВНИМАНИЕ: тестовые значения (gc_test_school_api_key, gc_test_school_host) попадают в HTML
  // SSR-страницы. Это намеренно — страница за requireInternalAccess, ключи тестовые (не продакшен).
  const operationsCatalog = toOperationSummaries()
  const [testSchoolApiKey, testSchoolHost] = await Promise.all([
    settingsLib.getSettingString(ctx, GC_TEST_SCHOOL_API_KEY),
    settingsLib.getSettingString(ctx, GC_TEST_SCHOOL_HOST)
  ])
  const testValues = { testSchoolApiKey, testSchoolHost }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Переменные для рендера`,
    payload: { logLevel, projectName, isAdmin, operationsCount: operationsCatalog.length }
  })

  return (
    <html>
      <head>
        <title>{getPageTitle(PANEL_PAGE_NAME, projectName)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script>{getLogLevelScript(logLevel)}</script>
        <style>{crtBackgroundStyles}</style>
        <style>{customScrollbarStyles}</style>
        <style>{gcHeaderCss1}</style>
        <style>{gcHeaderCss2}</style>
        <style>{gcHomeCss1}</style>
        <style>{gcHomeCss2}</style>
        <style>{gcHomeCss3}</style>
        <style>{requestTestTabStyles}</style>
        <style>{getPreloaderStyles()}</style>
        <script>{getPreloaderScript()}</script>
        <script src="/s/metric/clarity.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="geometric-bg"></div>
        <div id="tv-glitch"></div>
        <div id="boot-loader">
          <div class="boot-messages">
            <div id="boot-messages-container"></div>
          </div>
        </div>
        <HomePage
          projectTitle={getHeaderText(PANEL_PAGE_NAME, projectName)}
          indexUrl={indexUrl}
          profileUrl={profileUrl}
          loginUrl={loginUrl}
          isAuthenticated={true}
          isAdmin={isAdmin}
          adminUrl={adminUrl}
          testsUrl={testsUrl}
          initialDateFilter={initialDateFilter}
          apiUrls={apiUrls}
          operationsCatalog={operationsCatalog}
          testValues={testValues}
          projectRoot={PROJECT_ROOT}
        />
      </body>
    </html>
  )
})

export default indexPageRoute
