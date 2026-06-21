// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import { AnalyticsDashboards } from './tables/dashboards.table'
import { AnalyticsDatasets } from './tables/datasets.table'
import DashboardConfigPage from './pages/DashboardConfigPage.vue'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import { apiDashboardCreateRoute, apiDashboardUpdateByIdRoute } from './api/dashboards'
import { indexPageRoute } from './index'
import { licensePageRoute } from './license'
import { settingsPageRoute } from './settings'
import { Debug } from './shared/debug'
import { applyDebugLevel } from './lib/logging'
import { tailwindScript, cssVariables, commonStyles } from './styles'
import { getProjectName } from './shared/projectName'

/**
 * Страница конфигурации дашборда
 * Путь: /dev/partnership/dashboard-config
 * С параметром ?id=xxx - редактирование существующего дашборда
 * Без параметра - создание нового дашборда
 */
export const dashboardConfigRoute = app.html('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'dashboard-config-page')
  Debug.info(ctx, '[dashboard-config] открытие страницы конфигурации дашборда')

  const projectName = await getProjectName(ctx)
  const dashboardId = req.query.id as string | undefined
  let dashboard: any = null

  if (dashboardId) {
    try {
      Debug.info(ctx, `[dashboard-config] загрузка дашборда ${dashboardId}`)
      const foundDashboard = await AnalyticsDashboards.findById(ctx, dashboardId)
      if (foundDashboard) {
        dashboard = {
          id: foundDashboard.id,
          name: foundDashboard.name,
          description: foundDashboard.description,
          config: foundDashboard.config,
          createdAt: foundDashboard.createdAt,
          updatedAt: foundDashboard.updatedAt
        }
      }
    } catch (error) {
      Debug.error(
        ctx,
        `[dashboard-config] не удалось загрузить дашборд ${dashboardId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  // Загружаем список доступных датасетов для мастера компонентов дашборда
  let datasets: any[] = []
  try {
    datasets = await AnalyticsDatasets.findAll(ctx, {
      order: { createdAt: 'desc' }
    })
    Debug.info(ctx, `[dashboard-config] загружено датасетов: ${datasets.length}`)
  } catch (error) {
    Debug.error(
      ctx,
      `[dashboard-config] не удалось загрузить датасеты: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Генерируем URL на сервере для передачи в клиент
  const apiUrls = {
    create: apiDashboardCreateRoute.url(),
    update: apiDashboardUpdateByIdRoute.url(),
    indexPage: indexPageRoute.url(),
    dashboardConfig: dashboardConfigRoute.url()
  }

  return (
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>
          {projectName} -{' '}
          {dashboard ? `Редактирование дашборда: ${dashboard.name}` : 'Создание дашборда'}
        </title>

        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script dangerouslySetInnerHTML={{ __html: tailwindScript }} />

        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />

        <style type="text/tailwindcss">{cssVariables}</style>
        <style>{commonStyles}</style>

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
        `}</script>
      </head>
      <body>
        <div id="app" class="flex flex-col min-h-screen">
          <Header
            projectName={projectName}
            indexPageUrl={indexPageRoute.url()}
            isAdmin={true}
            settingsPageUrl={settingsPageRoute.url()}
            pageTitle={
              dashboard ? `Редактирование дашборда: ${dashboard.name}` : 'Создание дашборда'
            }
          />
          <div class="flex-1">
            <DashboardConfigPage
              initialDashboard={dashboard}
              initialDatasets={datasets}
              apiUrls={apiUrls}
            />
          </div>
          <Footer licenseUrl={licensePageRoute.url()} />
        </div>
      </body>
    </html>
  )
})

export default dashboardConfigRoute
