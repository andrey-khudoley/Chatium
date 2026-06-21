// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import SettingsPage from './pages/SettingsPage.vue'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import {
  tailwindScript,
  cssVariables,
  commonStyles,
  preloaderStyles,
  preloaderScript
} from './styles'
import { loginPageRoute } from './login'
import { indexPageRoute } from './index'
import { eventsPageRoute } from './events'
import { licensePageRoute } from './license'
import { getProjectName } from './shared/projectName'
import { Debug } from './shared/debug'
import { applyDebugLevel } from './lib/logging'
import { apiStopAllJobsRoute } from './api/settings'

export const settingsPageRoute = app.html('/', async (ctx, req) => {
  await applyDebugLevel(ctx, 'settings-page')

  // Проверяем авторизацию и редиректим на кастомную форму входа если нужно
  try {
    requireAccountRole(ctx, 'Admin')
  } catch (error) {
    Debug.warn(ctx, '[settings] Пользователь не админ, редирект на login')
    const loginUrl = loginPageRoute.url() + `?back=${encodeURIComponent(ctx.req.url)}`
    return (
      <html>
        <head>
          <meta http-equiv="refresh" content={`0; url=${loginUrl}`} />
          <script>{`window.location.href = '${loginUrl}'`}</script>
        </head>
        <body>
          <p>Перенаправление на страницу входа...</p>
        </body>
      </html>
    )
  }

  const projectName = await getProjectName(ctx)

  return (
    <html>
      <head>
        <title>{projectName} - Настройки</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <meta name="description" content="Шаблон со списком событий" />

        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script dangerouslySetInnerHTML={{ __html: tailwindScript }} />

        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />

        <style type="text/tailwindcss">{cssVariables}</style>
        <style>{commonStyles}</style>
        <style>{preloaderStyles}</style>

        <script>{`
          // Инициализация темы при загрузке страницы (до монтирования Vue)
          (function() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
              document.documentElement.classList.add('dark');
            } else if (savedTheme === 'light') {
              document.documentElement.classList.remove('dark');
            } else {
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (prefersDark) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            }
          })();

          window.hideAppLoader = function() {
            const loader = document.getElementById('app-loader');
            const appContent = document.getElementById('app-content');
            
            if (loader) {
              loader.classList.add('hiding');
              setTimeout(() => {
                loader.style.display = 'none';
              }, 300);
            }
            
            if (appContent) {
              appContent.style.opacity = '1';
              appContent.style.transition = 'opacity 0.3s ease-in';
            }
          }
        `}</script>
      </head>
      <body>
        <div id="app-loader">
          <div class="loader-content">
            <div class="loader-logo">
              <i class="fas fa-cog"></i>
            </div>
            <div class="loader-spinner">
              <div class="loader-ring"></div>
            </div>
            <p class="loader-text">Загрузка настроек...</p>
          </div>
        </div>

        <div id="app-content" style="opacity: 0;" class="flex flex-col min-h-screen">
          <Header
            projectName={projectName}
            indexPageUrl={indexPageRoute.url()}
            isAdmin={true}
            settingsPageUrl={settingsPageRoute.url()}
            eventsPageUrl={eventsPageRoute.url()}
            pageTitle="Настройки"
          />
          <div class="flex-1">
            <SettingsPage
              apiUrls={{
                indexPage: indexPageRoute.url(),
                eventsPage: eventsPageRoute.url(),
                stopAllJobs: apiStopAllJobsRoute.url()
              }}
            />
          </div>
          <Footer licenseUrl={licensePageRoute.url()} />
        </div>
        <div style="display: none;">Шаблон со списком событий</div>
      </body>
    </html>
  )
})

export default settingsPageRoute
