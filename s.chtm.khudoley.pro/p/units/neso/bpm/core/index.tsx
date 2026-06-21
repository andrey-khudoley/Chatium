// @shared
import { jsx } from '@app/html-jsx'
import HomePage from './pages/HomePage.vue'
import { getPreloaderStyles, getPreloaderScript } from './shared/preloader'
import { customScrollbarStyles } from './styles'
import { headerCss1 } from './pagecss/headerCss1'
import { headerCss2 } from './pagecss/headerCss2'
import { homePageCss1 } from './pagecss/homePageCss1'
import { homePageCss2 } from './pagecss/homePageCss2'
import { homeBootCss } from './pagecss/homeBootCss'
import { getLogLevelForPage, getLogLevelScript } from './shared/logLevel'
import { getFullUrl, ROUTES } from './config/routes'
import {
  INDEX_PAGE_NAME,
  BODY_TEXT,
  BODY_SUBTEXT,
  getPageTitle,
  getHeaderText
} from './config/project'
import * as loggerLib from './lib/logger.lib'
import * as settingsLib from './lib/settings.lib'

const LOG_PATH = 'index'

export const indexPageRoute = app.html('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Рендер главной страницы`,
    payload: { hasUser: !!ctx.user, isAdmin: ctx.user?.is?.('Admin') ?? false }
  })

  const isAuthenticated = !!ctx.user
  const isAdmin = ctx.user?.is('Admin') ?? false
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Переменные auth`,
    payload: { isAuthenticated, isAdmin }
  })
  const loginUrl = getFullUrl(ROUTES.login)
  const adminUrl = isAdmin ? getFullUrl(ROUTES.admin) : ''
  const testsUrl = isAuthenticated ? getFullUrl(ROUTES.tests) : ''
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] URL-ы`,
    payload: { loginUrl, adminUrl, testsUrl }
  })
  const logLevel = await getLogLevelForPage(ctx)
  const projectName = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Переменные для рендера`,
    payload: { logLevel, projectName }
  })

  return (
    <html>
      <head>
        <title>{getPageTitle(INDEX_PAGE_NAME, projectName)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script>{getLogLevelScript(logLevel)}</script>
        <style>{`
          ${homeBootCss}
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

          ${headerCss1}

          ${headerCss2}

          ${homePageCss1}

          ${homePageCss2}
        `}</style>
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
          projectName={BODY_TEXT}
          projectTitle={getHeaderText(INDEX_PAGE_NAME, projectName)}
          projectDescription={BODY_SUBTEXT}
          indexUrl={getFullUrl(ROUTES.index)}
          profileUrl={getFullUrl(ROUTES.profile)}
          loginUrl={loginUrl}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          adminUrl={adminUrl}
          testsUrl={testsUrl}
        />
      </body>
    </html>
  )
})

export default indexPageRoute
