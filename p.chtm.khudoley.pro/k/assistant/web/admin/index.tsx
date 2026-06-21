// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import { genSocketId } from '@app/socket'
import AdminPage from '../../pages/AdminPage.vue'
import { loginPageRoute } from '../login'
import { getPreloaderStyles, getPreloaderScript } from '../../shared/preloader'
import { getLogLevelForPage, getLogLevelScript } from '../../shared/logLevel'
import { getAdminLogsSocketId } from '../../lib/logger.lib'
import * as loggerLib from '../../lib/logger.lib'
import { getApiUrlForRoute, getFullUrl, ROUTES } from '../../config/routes'
import { ADMIN_PAGE_NAME, getPageTitle, getHeaderText } from '../../config/project'
import * as settingsLib from '../../lib/settings.lib'
import * as userSettingsLib from '../../lib/user-settings.lib'
import { customScrollbarStyles, formControlStyles, mobileSafeAreaStyles, VIEWPORT_META_CONTENT } from '../../styles'
import { toolsStateRoute } from '../../api/tools/state'
import { toolsControlRoute } from '../../api/tools/control'
import { focusToolsSocketId } from '../../shared/focus-tools-types'

const LOG_PATH = 'web/admin/index'

const adminPageStyles = `
  html { margin: 0; padding: 0; background: #0a0a0a; }
  body {
    margin: 0; padding: 0; background: #0a0a0a;
    position: relative; min-height: 100vh; overflow: hidden;
  }
  body.boot-complete { overflow-x: hidden; overflow-y: auto; }

  #geometric-bg {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1; pointer-events: none;
    background: radial-gradient(
      ellipse 100% 100% at 50% 50%,
      transparent 0%, transparent 75%, rgba(0,0,0,0.3) 85%, rgba(0,0,0,0.7) 92%,
      rgba(0,0,0,0.95) 97%, rgba(0,0,0,0.99) 100%
    );
    border-radius: 3% / 4%;
    box-shadow: inset 0 0 200px 50px rgba(0,0,0,0.8), inset 0 0 100px 20px rgba(0,0,0,0.6);
    animation: crt-ambient-glow 3s ease-in-out infinite;
  }
  @media (max-width: 768px) {
    #geometric-bg {
      background: radial-gradient(ellipse 150% 100% at 50% 50%, transparent 0%, transparent 80%, rgba(0,0,0,0.5) 90%, rgba(0,0,0,0.95) 100%);
      border-radius: 0;
    }
  }
  @keyframes crt-ambient-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.97; } }

  body::after {
    content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px);
    pointer-events: none; z-index: 999999; border-radius: 3% / 4%; opacity: 0;
    animation: scanline-fade-in 0.6s ease-out 1s forwards, scanline-flicker 8s linear 1.6s infinite;
  }
  @keyframes scanline-fade-in { from { opacity: 0; } to { opacity: 0.3; } }
  @keyframes scanline-flicker { 0% { opacity: 0.25; } 50% { opacity: 0.35; } 100% { opacity: 0.25; } }

  body::before {
    content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none; z-index: 999998; border-radius: 3% / 4%;
    box-shadow: inset 0 0 80px rgba(0,0,0,0.3), inset 0 2px 1px rgba(255,255,255,0.01);
    opacity: 0; animation: bezel-fade-in 0.8s ease-out 1.2s forwards;
  }
  @keyframes bezel-fade-in { from { opacity: 0; } to { opacity: 1; } }

  #geometric-bg::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cg stroke='%232a2a2a' stroke-width='0.12' fill='none'%3E%3Cpath d='M 0,0 C -2,15 -3,35 -3,50 C -3,65 -2,85 0,100'/%3E%3Cpath d='M 6,0 C 4,20 4,40 4,50 C 4,60 4,80 6,100'/%3E%3Cpath d='M 12,0 L 11,25 C 11,35 11,65 11,75 L 12,100'/%3E%3Cpath d='M 18,0 L 18,30 L 18,70 L 18,100'/%3E%3Cpath d='M 24,0 L 24,100'/%3E%3Cpath d='M 30,0 L 30,100'/%3E%3Cpath d='M 36,0 L 36,100'/%3E%3Cpath d='M 42,0 L 42,100'/%3E%3Cpath d='M 48,0 L 48,100'/%3E%3Cpath d='M 54,0 L 54,100'/%3E%3Cpath d='M 60,0 L 60,100'/%3E%3Cpath d='M 66,0 L 66,100'/%3E%3Cpath d='M 72,0 L 72,100'/%3E%3Cpath d='M 78,0 L 78,100'/%3E%3Cpath d='M 84,0 L 84,30 L 84,70 L 84,100'/%3E%3Cpath d='M 90,0 L 91,25 C 91,35 91,65 91,75 L 90,100'/%3E%3Cpath d='M 96,0 C 98,20 98,40 98,50 C 98,60 98,80 96,100'/%3E%3Cpath d='M 100,0 C 103,15 105,35 105,50 C 105,65 103,85 100,100'/%3E%3Cpath d='M 0,0 C 15,-2 35,-3 50,-3 C 65,-3 85,-2 100,0'/%3E%3Cpath d='M 0,6 C 20,4 40,4 50,4 C 60,4 80,4 100,6'/%3E%3Cpath d='M 0,12 L 25,11 C 35,11 65,11 75,11 L 100,12'/%3E%3Cpath d='M 0,18 L 30,18 L 70,18 L 100,18'/%3E%3Cpath d='M 0,24 L 100,24'/%3E%3Cpath d='M 0,30 L 100,30'/%3E%3Cpath d='M 0,36 L 100,36'/%3E%3Cpath d='M 0,42 L 100,42'/%3E%3Cpath d='M 0,48 L 100,48'/%3E%3Cpath d='M 0,54 L 100,54'/%3E%3Cpath d='M 0,60 L 100,60'/%3E%3Cpath d='M 0,66 L 100,66'/%3E%3Cpath d='M 0,72 L 100,72'/%3E%3Cpath d='M 0,78 L 100,78'/%3E%3Cpath d='M 0,84 L 100,84'/%3E%3Cpath d='M 0,90 L 25,91 C 35,91 65,91 75,91 L 100,90'/%3E%3Cpath d='M 0,96 C 20,98 40,98 50,98 C 60,98 80,98 100,96'/%3E%3Cpath d='M 0,100 C 15,103 35,105 50,105 C 65,105 85,103 100,100'/%3E%3C/g%3E%3C/svg%3E");
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 0.3;
  }

  #geometric-bg::after {
    content: ''; position: absolute; top: -50%; right: -10%; width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(211,35,75,0.08) 0%, transparent 70%);
    border-radius: 50%; animation: geometric-float 20s ease-in-out infinite;
  }
  @keyframes geometric-float { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,50px) scale(1.1); } }

  :root {
    --color-bg: #0a0a0a; --color-bg-secondary: #141414; --color-bg-tertiary: #1a1a1a;
    --color-text: #e8e8e8; --color-text-secondary: #a0a0a0; --color-text-tertiary: #707070;
    --color-border: #2a2a2a; --color-border-light: #3a3a3a;
    --color-accent: #d3234b; --color-accent-hover: #e6395f; --color-accent-light: rgba(211,35,75,0.15);
  }
  body {
    font-family: 'Share Tech Mono', 'Courier New', monospace;
    margin: 0;
    background: var(--color-bg);
    letter-spacing: 0.03em;
  }
  ::selection { background: #e0335a; color: #fff; }
  ::-moz-selection { background: #e0335a; color: #fff; }
`

export const adminPageRoute = app.html('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос страницы админки`,
    payload: { hasUser: !!ctx.user }
  })

  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Проверка requireAccountRole Admin`,
      payload: { hasUser: !!ctx.user }
    })
    requireAccountRole(ctx, 'Admin')
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] requireAccountRole пройдена`,
      payload: {}
    })
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Редирект на логин: требуется роль Admin`,
      payload: { error: String(error), backUrl: req.url }
    })
    const loginUrl = loginPageRoute.url() + `?back=${encodeURIComponent(req.url)}`
    return (
      <html>
        <head>
          <title>Вход</title>
          <meta name="viewport" content={VIEWPORT_META_CONTENT} />
          <meta charset="UTF-8" />
          <script src="/s/metric/clarity.js"></script>
          <meta http-equiv="refresh" content={`0; url=${loginUrl}`} />
          <script>{`window.location.href = '${loginUrl}'`}</script>
          <style>{adminPageStyles}</style>
        </head>
        <body>
          <p>Перенаправление на страницу входа...</p>
        </body>
      </html>
    )
  }

  const indexUrl = getFullUrl(ROUTES.index)
  const profileUrl = getFullUrl(ROUTES.profile)
  const adminUrl = getFullUrl(ROUTES.admin)
  const loginUrl = getFullUrl(ROUTES.login)
  const toolsStateUrl = getApiUrlForRoute(toolsStateRoute.url())
  const toolsControlUrl = getApiUrlForRoute(toolsControlRoute.url())
  const encodedFocusToolsSocketId = await genSocketId(ctx, focusToolsSocketId(ctx.user.id))
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] URL-ы`,
    payload: { indexUrl, profileUrl, adminUrl, loginUrl }
  })
  const logLevel = await getLogLevelForPage(ctx)
  const logsSocketId = getAdminLogsSocketId(ctx)
  const encodedLogsSocketId = await genSocketId(ctx, logsSocketId)
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Переменные сокета и уровня`,
    payload: { logLevel, logsSocketId, hasEncodedLogsSocketId: !!encodedLogsSocketId }
  })
  const projectName = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)
  const timezoneOffsetHours = await userSettingsLib.getTimezoneOffsetForCtxUser(ctx)
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Переменные для рендера`,
    payload: { projectName }
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Рендер страницы админки`,
    payload: { logLevel, logsSocketId }
  })

  return (
    <html>
      <head>
        <title>{getPageTitle(ADMIN_PAGE_NAME, projectName)}</title>
        <meta name="viewport" content={VIEWPORT_META_CONTENT} />
        <meta charset="UTF-8" />
        <script>{getLogLevelScript(logLevel)}</script>
        <script src="/s/metric/clarity.js"></script>
        <style>{adminPageStyles}</style>
        <style>{customScrollbarStyles}</style>
        <style>{mobileSafeAreaStyles}</style>
        <style>{formControlStyles}</style>
        <style>{getPreloaderStyles()}</style>
        <script>{getPreloaderScript()}</script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div id="geometric-bg"></div>
        <div id="boot-loader">
          <div class="boot-messages">
            <div id="boot-messages-container"></div>
          </div>
        </div>
        <AdminPage
          projectTitle={getHeaderText(ADMIN_PAGE_NAME, projectName)}
          indexUrl={indexUrl}
          profileUrl={profileUrl}
          testsUrl={getFullUrl(ROUTES.tests)}
          loginUrl={loginUrl}
          isAuthenticated={true}
          isAdmin={true}
          adminUrl={adminUrl}
          toolsStateUrl={toolsStateUrl}
          toolsControlUrl={toolsControlUrl}
          encodedFocusToolsSocketId={encodedFocusToolsSocketId}
          encodedLogsSocketId={encodedLogsSocketId}
          timezoneOffsetHours={timezoneOffsetHours}
        />
      </body>
    </html>
  )
})

export default adminPageRoute
