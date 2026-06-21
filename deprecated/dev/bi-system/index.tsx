// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import IndexPage from './pages/IndexPage.vue'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import {
  tailwindScript,
  cssVariables,
  commonStyles,
  preloaderStyles,
  preloaderScript
} from './styles'
import { integrationIsEnabled } from '@gc-mcp-server/sdk'
import { installPluginRoute } from './api/install-plugin'
import { loginPageRoute } from './login'
import { AnalyticsDatasets } from './tables/datasets.table'
import { AnalyticsDashboards } from './tables/dashboards.table'
import { apiDatasetDeleteByIdRoute, apiDatasetDeleteReadyRoute } from './api/datasets'
import { datasetConfigRoute } from './dataset-config'
import { apiDashboardDeleteByIdRoute } from './api/dashboards'
import { dashboardConfigRoute } from './dashboard-config'
import { dashboardViewRoute } from './dashboard-view'
import { settingsPageRoute } from './settings'
import { eventsPageRoute } from './events'
import { licensePageRoute } from './license'
import { Debug } from './shared/debug'
import { applyDebugLevel } from './lib/logging'
import { getProjectName } from './shared/projectName'
import { apiGetSettingsRoute } from './api/settings'

export const indexPageRoute = app.html('/', async (ctx, req) => {
  await applyDebugLevel(ctx, 'index-page')
  Debug.info(ctx, '[index] Рендер главной страницы начат')

  // Проверяем авторизацию и редиректим на кастомную форму входа если нужно
  try {
    requireAccountRole(ctx, 'Admin')
  } catch (error) {
    Debug.warn(ctx, '[index] Пользователь не админ, редирект на login')
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

  const isConfigured = await integrationIsEnabled(ctx)
  Debug.info(ctx, `[index] Статус интеграции GetCourse: ${isConfigured ? 'готов' : 'не настроен'}`)

  // Получаем название проекта из настроек
  const projectName = await getProjectName(ctx)

  // Загружаем датасеты на сервере (SSR)
  let datasets: any[] = []
  try {
    datasets = await AnalyticsDatasets.findAll(ctx, {
      order: { createdAt: 'desc' }
    })
    Debug.info(ctx, `[index] Загружено датасетов: ${datasets.length}`)
  } catch (error) {
    Debug.error(
      ctx,
      `Failed to load datasets: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Загружаем дашборды на сервере (SSR)
  let dashboards: any[] = []
  try {
    dashboards = await AnalyticsDashboards.findAll(ctx, {
      order: { createdAt: 'desc' }
    })
    Debug.info(ctx, `[index] Загружено дашбордов: ${dashboards.length}`)
  } catch (error) {
    Debug.error(
      ctx,
      `Failed to load dashboards: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Генерируем URL на сервере для передачи в клиент
  const apiUrls = {
    deleteDataset: apiDatasetDeleteByIdRoute.url(),
    deleteDatasetReady: apiDatasetDeleteReadyRoute.url(),
    indexPage: indexPageRoute.url(),
    datasetConfig: datasetConfigRoute.url(),
    deleteDashboard: apiDashboardDeleteByIdRoute.url(),
    dashboardConfig: dashboardConfigRoute.url(),
    dashboardView: dashboardViewRoute.url(),
    settingsPage: settingsPageRoute.url(),
    eventsPage: eventsPageRoute.url(),
    licensePage: licensePageRoute.url(),
    settingsList: apiGetSettingsRoute.url()
  }

  return (
    <html>
      <head>
        <title>{isConfigured ? projectName : `Настройка GetCourse - ${projectName}`}</title>
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
        {isConfigured && <style>{preloaderStyles}</style>}

        {isConfigured && (
          <script>{`
          // Инициализация темы при загрузке страницы (до монтирования Vue)
          (function() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
              document.documentElement.classList.add('dark');
            } else if (savedTheme === 'light') {
              document.documentElement.classList.remove('dark');
            } else {
              // Если нет сохранённой темы, используем системную
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
        )}
      </head>
      <body>
        {isConfigured ? (
          <>
            <div id="app-loader">
              <div class="loader-content">
                <div class="loader-logo">
                  <i class="fas fa-wrench"></i>
                </div>
                <div class="loader-spinner">
                  <div class="loader-ring"></div>
                </div>
                <p class="loader-text">Загрузка приложения...</p>
              </div>
            </div>

            <div id="app-content" style="opacity: 0;" class="flex flex-col min-h-screen">
              <Header
                projectName={projectName}
                indexPageUrl={indexPageRoute.url()}
                isAdmin={true}
                settingsPageUrl={settingsPageRoute.url()}
                eventsPageUrl={eventsPageRoute.url()}
                pageTitle=""
              />
              <div class="flex-1">
                <IndexPage
                  initialDatasets={datasets}
                  initialDashboards={dashboards}
                  apiUrls={apiUrls}
                />
              </div>
              <Footer licenseUrl={licensePageRoute.url()} />
            </div>
            <div style="display: none;">Шаблон со списком событий</div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '20px'
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '48px 32px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                textAlign: 'center',
                maxWidth: '600px',
                width: '100%'
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  color: '#667eea',
                  marginBottom: '24px'
                }}
              >
                <i class="fas fa-plug"></i>
              </div>
              <h1
                style={{
                  margin: '0 0 16px 0',
                  color: '#2d3748',
                  fontSize: '28px',
                  fontWeight: '700'
                }}
              >
                {projectName}
              </h1>
              <p
                style={{
                  color: '#718096',
                  fontSize: '14px',
                  marginBottom: '24px'
                }}
              >
                Соединение с GetCourse не настроено
              </p>
              <p
                style={{
                  color: '#718096',
                  fontSize: '16px',
                  marginBottom: '32px',
                  lineHeight: '1.6'
                }}
              >
                Для работы аналитики необходимо установить и настроить подключение к GetCourse MCP
                Server
              </p>
              <button
                onclick={`
                this.disabled = true;
                this.textContent = 'Устанавливаю...';
                this.style.opacity = '0.7';
                fetch('${installPluginRoute.url()}', { method: 'POST' })
                  .then(response => response.json())
                  .then(result => {
                    if (result.success) {
                      window.location.href = '${ctx.account.url('/app/gc-mcp-server') + `?backUrl=${encodeURIComponent(indexPageRoute.url())}&backText=${encodeURIComponent('Вернуться к аналитике')}`}';
                    } else {
                      alert('Ошибка установки: ' + (result.error || 'Неизвестная ошибка'));
                      this.disabled = false;
                      this.textContent = 'Настроить GetCourse';
                      this.style.opacity = '1';
                    }
                  })
                  .catch(error => {
                    alert('Ошибка установки: ' + error.message);
                    this.disabled = false;
                    this.textContent = 'Настроить GetCourse';
                    this.style.opacity = '1';
                  });
              `}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#667eea',
                  color: 'white',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'
                }}
                onmouseover="this.style.backgroundColor='#5a67d8'; this.style.transform='translateY(-2px)'"
                onmouseout="this.style.backgroundColor='#667eea'; this.style.transform='translateY(0)'"
              >
                <i class="fas fa-cog" style={{ marginRight: '8px' }}></i>
                Настроить GetCourse
              </button>
            </div>
          </div>
        )}
      </body>
    </html>
  )
})

export default indexPageRoute
