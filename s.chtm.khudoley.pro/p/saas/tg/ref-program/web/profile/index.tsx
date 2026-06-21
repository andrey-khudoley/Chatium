// @shared
import { jsx } from '@app/html-jsx'
import { requireRealUser } from '@app/auth'
import ProfilePage from '../../pages/ProfilePage.vue'
import { getPreloaderStyles, getPreloaderScript } from '../../shared/preloader'
import { getLogLevelForPage, getLogLevelScript } from '../../shared/logLevel'
import * as loggerLib from '../../lib/logger.lib'
import { getFullUrl, ROUTES } from '../../config/routes'
import { PROFILE_PAGE_NAME, getPageTitle, getHeaderText } from '../../config/project'
import * as settingsLib from '../../lib/settings.lib'
import { customScrollbarStyles, geometricBgStyles, appLayoutOverGridStyles } from '../../styles'

const LOG_PATH = 'web/profile/index'

export const profilePageRoute = app.html('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос страницы профиля`,
    payload: { hasUser: !!ctx.user }
  })

  let user
  try {
    user = requireRealUser(ctx)
  } catch (error: unknown) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Редирект на логин: требуется авторизация`,
      payload: { error: String(error), backUrl: req.url }
    })
    return ctx.resp.redirect('../login?back=' + encodeURIComponent(req.url))
  }

  const isAdmin = user.is('Admin')
  const adminUrl = isAdmin ? getFullUrl(ROUTES.admin) : ''
  const loginUrl = getFullUrl(ROUTES.login)
  const logLevel = await getLogLevelForPage(ctx)
  const projectName = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Рендер страницы профиля`,
    payload: { isAdmin, displayName: user.displayName }
  })

  return (
    <html>
      <head>
        <title>{getPageTitle(PROFILE_PAGE_NAME, projectName)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script>{getLogLevelScript(logLevel)}</script>
        <script src="/s/metric/clarity.js"></script>
        <style>{getPreloaderStyles()}</style>
        <style>{customScrollbarStyles}</style>
        <style>{`
          html {
            margin: 0;
            padding: 0;
            background: #0a0a0a;
          }
          body {
            margin: 0;
            padding: 0;
            background: #0a0a0a;
            position: relative;
            min-height: 100vh;
            overflow: hidden;
          }

          body.boot-complete {
            overflow-x: hidden;
            overflow-y: auto;
          }

          ${geometricBgStyles}
          ${appLayoutOverGridStyles}

          body::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.03),
              rgba(0, 0, 0, 0.03) 1px,
              transparent 1px,
              transparent 2px
            );
            pointer-events: none;
            z-index: 999999;
            border-radius: 3% / 4%;
            opacity: 0;
            animation:
              scanline-fade-in 0.6s ease-out 1s forwards,
              scanline-flicker 8s linear 1.6s infinite;
          }

          @keyframes scanline-fade-in {
            from { opacity: 0; }
            to { opacity: 0.3; }
          }

          @keyframes scanline-flicker {
            0% { opacity: 0.25; }
            50% { opacity: 0.35; }
            100% { opacity: 0.25; }
          }

          @media (max-width: 768px) {
            body::after {
              border-radius: 0;
            }
          }

          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 999998;
            border-radius: 3% / 4%;
            box-shadow:
              inset 0 0 80px rgba(0, 0, 0, 0.3),
              inset 0 2px 1px rgba(255, 255, 255, 0.01);
            opacity: 0;
            animation: bezel-fade-in 0.8s ease-out 1.2s forwards;
          }

          @keyframes bezel-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @media (max-width: 768px) {
            body::before {
              border-radius: 0;
              box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.2);
            }
          }

          ${getPreloaderStyles()}
        `}</style>
        <script>{getPreloaderScript()}</script>
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
            --color-accent-light: rgba(211, 35, 75, 0.1);
            --color-accent-medium: rgba(211, 35, 75, 0.2);
          }

          ::selection {
            background: #e0335a;
            color: #ffffff;
          }

          ::-moz-selection {
            background: #e0335a;
            color: #ffffff;
          }
        `}</style>
      </head>
      <body>
        <div id="geometric-bg"></div>
        <div id="boot-loader">
          <div class="boot-messages">
            <div id="boot-messages-container"></div>
          </div>
        </div>
        <ProfilePage
          projectTitle={getHeaderText(PROFILE_PAGE_NAME, projectName)}
          indexUrl={getFullUrl(ROUTES.index)}
          profileUrl={getFullUrl(ROUTES.profile)}
          testsUrl={getFullUrl(ROUTES.tests)}
          loginUrl={loginUrl}
          isAuthenticated={true}
          isAdmin={isAdmin}
          adminUrl={adminUrl}
          user={{
            displayName: user.displayName,
            confirmedEmail: user.confirmedEmail,
            confirmedPhone: user.confirmedPhone
          }}
        />
      </body>
    </html>
  )
})

export default profilePageRoute
