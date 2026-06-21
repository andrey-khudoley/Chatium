// @shared
import { jsx } from '@app/html-jsx'
import InvitePage from '../../pages/InvitePage.vue'
import { getPreloaderStyles, getPreloaderScript } from '../../shared/preloader'
import { getLogLevelForPage, getLogLevelScript } from '../../shared/logLevel'
import * as loggerLib from '../../lib/logger.lib'
import { getFullUrl, ROUTES, ROUTE_PATHS, parseTildeParam } from '../../config/routes'
import { getPageTitle } from '../../config/project'
import * as settingsLib from '../../lib/settings.lib'
import { customScrollbarStyles, geometricBgStyles, appLayoutOverGridStyles } from '../../styles'

const LOG_PATH = 'web/invite/index'

function getPathname(url: string): string {
  if (url.includes('://')) {
    try {
      return new URL(url).pathname
    } catch {
      return url.split('?')[0] || ''
    }
  }
  return url.split('?')[0] || ''
}

export const invitePageRoute = app.html('/', async (ctx, req) => {
  const pathname = getPathname(req.url || '')
  const inviteBasePath = getFullUrl(ROUTE_PATHS.invite)
  const token = parseTildeParam(pathname, inviteBasePath)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос страницы приглашения`,
    payload: { hasToken: !!token, pathname }
  })

  const loginUrl = getFullUrl(ROUTES.login)
  const indexUrl = getFullUrl(ROUTES.index)
  const logLevel = await getLogLevelForPage(ctx)
  const projectName = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)

  const pageStyles = `
    html { margin: 0; padding: 0; background: #0a0a0a; }
    body { margin: 0; padding: 0; background: #0a0a0a; position: relative; min-height: 100vh; overflow: hidden; }
    body.boot-complete { overflow-x: hidden; overflow-y: auto; }
    :root {
      --color-bg: #0a0a0a; --color-bg-secondary: #141414; --color-text: #e8e8e8;
      --color-accent: #d3234b; --color-accent-hover: #e6395f;
    }
    ::selection { background: #e0335a; color: #fff; }
    ${geometricBgStyles}
    ${appLayoutOverGridStyles}
    ${getPreloaderStyles()}
  `

  return (
    <html>
      <head>
        <title>{getPageTitle('Приглашение', projectName)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script>{getLogLevelScript(logLevel)}</script>
        <script src="/s/metric/clarity.js"></script>
        <style>{pageStyles}</style>
        <style>{customScrollbarStyles}</style>
        <script>{getPreloaderScript()}</script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="geometric-bg"></div>
        <div id="boot-loader">
          <div class="boot-messages">
            <div id="boot-messages-container"></div>
          </div>
        </div>
        <InvitePage
          token={token || ''}
          indexUrl={indexUrl}
          loginUrl={loginUrl}
          isAuthenticated={!!ctx.user}
        />
      </body>
    </html>
  )
})

export default invitePageRoute
