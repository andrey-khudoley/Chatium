// @shared
import { jsx } from '@app/html-jsx'
import HomePage from './pages/HomePage.vue'
import IndexPage from './pages/IndexPage.vue'
import { getPreloaderStyles, getPreloaderScript } from './shared/preloader'
import { customScrollbarStyles, geometricBgStyles, appLayoutOverGridStyles } from './styles'
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
    severity: 7,
    message: `[${LOG_PATH}] Рендер главной страницы`,
    payload: { hasUser: !!ctx.user, isAdmin: ctx.user?.is?.('Admin') ?? false }
  })

  const isAuthenticated = !!ctx.user
  const isAdmin = ctx.user?.is('Admin') ?? false
  const loginUrl = getFullUrl(ROUTES.login)
  const adminUrl = isAdmin ? getFullUrl(ROUTES.admin) : ''
  const testsUrl = isAuthenticated ? getFullUrl(ROUTES.tests) : ''
  const logLevel = await getLogLevelForPage(ctx)
  const projectName = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)

  return (
    <html>
      <head>
        <title>{getPageTitle(INDEX_PAGE_NAME, projectName)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script>{getLogLevelScript(logLevel)}</script>
        <style>{`
          html { 
            background: #0a0a0a;
          }
          body { 
            margin: 0; 
            background: #0a0a0a;
            position: relative;
            min-height: 100vh;
            overflow: hidden;
          }
          
          body.boot-complete {
            overflow-x: hidden;
            overflow-y: auto;
          }
          
          /* Скрываем контент до завершения загрузки */
          .app-layout:not(.global-glitch-active) {
            opacity: 0;
            position: relative;
            z-index: 2;
            transform: scale(0.96);
            filter: blur(1px);
          }
          
          /* Анимация появления запускается только один раз при загрузке */
          body.boot-complete .app-layout:not(.app-layout-appeared) {
            animation: crt-power-on 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.5s forwards;
          }
          
          /* После завершения анимации появления класс предотвращает её повторный запуск */
          body.boot-complete .app-layout.app-layout-appeared:not(.global-glitch-active) {
            opacity: 1 !important;
            transform: scale(1) translate(0, 0) !important;
            filter: blur(0) !important;
          }
          
          /* При активном глитче убираем все конфликтующие стили */
          body.boot-complete .app-layout.global-glitch-active {
            opacity: 1 !important;
          }
          
          @keyframes crt-power-on {
            0% {
              opacity: 0;
              transform: scale(0.96) translate(0, 0);
              filter: blur(1.2px);
            }
            8% {
              opacity: 0.2;
              transform: scale(0.97) translate(0.15px, -0.1px);
              filter: blur(1px);
            }
            16% {
              opacity: 0.4;
              transform: scale(0.98) translate(-0.12px, 0.08px);
              filter: blur(0.8px);
            }
            24% {
              opacity: 0.55;
              transform: scale(0.985) translate(0.1px, -0.06px);
              filter: blur(0.6px);
            }
            32% {
              opacity: 0.68;
              transform: scale(0.99) translate(-0.08px, 0.05px);
              filter: blur(0.5px);
            }
            40% {
              opacity: 0.78;
              transform: scale(0.995) translate(0.06px, -0.04px);
              filter: blur(0.4px);
            }
            48% {
              opacity: 0.85;
              transform: scale(0.998) translate(-0.04px, 0.03px);
              filter: blur(0.3px);
            }
            56% {
              opacity: 0.9;
              transform: scale(1.0) translate(0.03px, -0.02px);
              filter: blur(0.2px);
            }
            64% {
              opacity: 0.94;
              transform: scale(1.0) translate(-0.02px, 0.015px);
              filter: blur(0.15px);
            }
            72% {
              opacity: 0.97;
              transform: scale(1.0) translate(0.015px, -0.01px);
              filter: blur(0.1px);
            }
            80% {
              opacity: 0.99;
              transform: scale(1.0) translate(-0.01px, 0.008px);
              filter: blur(0.05px);
            }
            88% {
              opacity: 1;
              transform: scale(1.0) translate(0.008px, -0.005px);
              filter: blur(0.02px);
            }
            96% {
              opacity: 1;
              transform: scale(1.0) translate(-0.005px, 0.003px);
              filter: blur(0.01px);
            }
            100% {
              opacity: 1;
              transform: scale(1.0) translate(0, 0);
              filter: blur(0);
            }
          }
          
          /* LAYER 1: фоновая сетка (общие стили из styles.tsx) */
          ${geometricBgStyles}
          ${appLayoutOverGridStyles}
          
          /* LAYER 3: Cosmetic overlay - Scanlines and subtle effects (TOP, z-index: 999999) */
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
          
          /* Screen bezel effect */
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
      </head>
      <body>
        <div id="geometric-bg"></div>
        <div id="tv-glitch"></div>
        <div id="boot-loader">
          <div class="boot-messages">
            <div id="boot-messages-container"></div>
          </div>
        </div>
        {isAuthenticated ? (
          <IndexPage
            projectTitle={getHeaderText(INDEX_PAGE_NAME, projectName)}
            indexUrl={getFullUrl(ROUTES.index)}
            profileUrl={getFullUrl(ROUTES.profile)}
            loginUrl={loginUrl}
            isAuthenticated={true}
            isAdmin={isAdmin}
            adminUrl={adminUrl}
            testsUrl={testsUrl}
          />
        ) : (
          <HomePage
            projectName={BODY_TEXT}
            projectTitle={getHeaderText(INDEX_PAGE_NAME, projectName)}
            projectDescription={BODY_SUBTEXT}
            indexUrl={getFullUrl(ROUTES.index)}
            profileUrl={getFullUrl(ROUTES.profile)}
            loginUrl={loginUrl}
            isAuthenticated={false}
            isAdmin={false}
            adminUrl={''}
            testsUrl={''}
          />
        )}
      </body>
    </html>
  )
})

export default indexPageRoute
