import { jsx } from '@app/html-jsx'
import { requireRealUser } from '@app/auth'
import HomePage from './pages/HomePage.vue'
import { getPreloaderStyles, getPreloaderScript } from './shared/preloader'
import { customScrollbarStyles, requestTestTabStyles } from './styles'
import { crtBackgroundStyles1 } from './pagecss/lavatopIndexCss1'
import { lavatopHeaderCss1 } from './pagecss/lavatopHeaderCss1'
import { lavatopHeaderCss2 } from './pagecss/lavatopHeaderCss2'
import { lavatopHomeCss1 } from './pagecss/lavatopHomeCss1'
import { lavatopHomeCss2 } from './pagecss/lavatopHomeCss2'
import { lavatopHomeCss3 } from './pagecss/lavatopHomeCss3'
import { getLogLevelForPage, getLogLevelScript } from './shared/logLevel'
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

const PANEL_PAGE_NAME = 'Панель'

const LOG_PATH = 'index'

export const indexPageRoute = app.html('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
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
    recentWebhooks: getFullUrl('/api/admin/webhooks/recent'),
    reforwardWebhook: getFullUrl('/api/admin/webhooks/reforward'),
    accessGenerateInvite: getFullUrl('/api/access/generate-invite'),
    accessRevokeInvite: getFullUrl('/api/access/revoke-invite'),
    accessRevokeGrant: getFullUrl('/api/access/revoke-grant'),
    accessInvites: getFullUrl('/api/access/invites'),
    accessGrants: getFullUrl('/api/access/grants')
  }

  const logLevel = await getLogLevelForPage(ctx)
  const projectName = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)

  // Каталог операций и тестовые значения для вкладки «Создать запрос».
  // ВНИМАНИЕ: тестовое значение (lava_test_apikey) попадает в HTML SSR-страницы.
  // Это намеренно — страница за requireInternalAccess, ключ тестовый (не продакшен-секрет).
  const operationsCatalog = toOperationSummaries()
  const testApiKey = await settingsLib.getLavaTestApiKey(ctx)
  const testValues = { testApiKey }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] render`,
    payload: { logLevel, projectName, operationsCount: operationsCatalog.length }
  })

  return (
    <html>
      <head>
        <title>{getPageTitle(PANEL_PAGE_NAME, projectName)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script>{getLogLevelScript(logLevel)}</script>
        <style>{`
          ${crtBackgroundStyles1}
${getPreloaderStyles()}

          /* TV Glitch Effect */
          #tv-glitch {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999997;
            pointer-events: none;
            opacity: 0;
          }

          #tv-glitch.active {
            animation: glitch-wave 1s cubic-bezier(0.4, 0, 0.2, 1);
          }

          @keyframes glitch-wave {
            0%, 100% { opacity: 0; }
            10%, 90% { opacity: 0.8; }
          }

          #tv-glitch::before {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            height: 80px;
            background: transparent;
          }

          #tv-glitch.active::before {
            animation: glitch-zone-move 1s cubic-bezier(0.4, 0, 0.2, 1);
          }

          @keyframes glitch-zone-move {
            0% { top: -80px; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }

          body.glitch-active .app-layout {
            animation: body-glitch 1s cubic-bezier(0.4, 0, 0.2, 1);
            will-change: transform;
          }

          @keyframes body-glitch {
            0%, 100% { transform: translateX(0); }
            15% { transform: translateX(-2px); }
            18% { transform: translateX(3px); }
            22% { transform: translateX(-2px); }
            25% { transform: translateX(2px); }
            28% { transform: translateX(0); }
            50% { transform: translateX(-3px); }
            53% { transform: translateX(2px); }
            56% { transform: translateX(0); }
            75% { transform: translateX(2px); }
            78% { transform: translateX(-2px); }
            82% { transform: translateX(0); }
          }
        `}</style>
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
        <style>{`
          :root {
            --color-bg: #0a0a0a;
            --color-bg-secondary: #141414;
            --color-bg-tertiary: #1a1a1a;
            --color-text: #e8e8e8;
            --color-text-secondary: #a0a0a0;
            --color-text-tertiary: #707070;
            --color-border: #2a2a2a;
            --color-border-light: #3a3a3a;
            --color-accent: #d3234b;
            --color-accent-hover: #e6395f;
            --color-accent-light: rgba(211, 35, 75, 0.15);
            --color-accent-medium: rgba(211, 35, 75, 0.25);
          }

          ::selection {
            background: #e0335a;
            color: #ffffff;
          }

          ::-moz-selection {
            background: #e0335a;
            color: #ffffff;
          }

          ${customScrollbarStyles}
        `}</style>
        <style>{requestTestTabStyles}</style>
        <style>{lavatopHeaderCss1}</style>
        <style>{lavatopHeaderCss2}</style>
        <style>{lavatopHomeCss1}</style>
        <style>{lavatopHomeCss2}</style>
        <style>{lavatopHomeCss3}</style>
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
