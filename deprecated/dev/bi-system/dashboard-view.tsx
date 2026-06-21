// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import { AnalyticsDashboards } from './tables/dashboards.table'
import { AnalyticsDatasets } from './tables/datasets.table'
import DashboardViewPage from './pages/DashboardViewPage.vue'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import { indexPageRoute } from './index'
import { licensePageRoute } from './license'
import { settingsPageRoute } from './settings'
import { Debug } from './shared/debug'
import { applyDebugLevel } from './lib/logging'
import { tailwindScript, cssVariables, commonStyles } from './styles'
import { getProjectName } from './shared/projectName'

/**
 * Полноэкранная страница просмотра дашборда
 * Путь: /dev/partnership/dashboard-view?id=...
 */
export const dashboardViewRoute = app.html('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'dashboard-view-page')
  Debug.info(ctx, '[dashboard-view] открытие страницы просмотра дашборда')

  const projectName = await getProjectName(ctx)
  const dashboardId = req.query.id as string | undefined

  if (!dashboardId) {
    return (
      <html lang="ru">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>{projectName} - Дашборд не найден</title>

          <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
          {/* @ts-expect-error - dangerouslySetInnerHTML is supported in Chatium JSX for script tags */}
          <script dangerouslySetInnerHTML={{ __html: tailwindScript }} />

          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />

          <style type="text/tailwindcss">{cssVariables}</style>
          <style>{commonStyles}</style>
        </head>
        <body class="bg-gray-900 text-gray-100">
          <div class="min-h-screen flex items-center justify-center">
            <div class="text-center">
              <div class="text-5xl mb-4 text-red-400">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <h1 class="text-2xl font-bold mb-2">Дашборд не найден</h1>
              <p class="opacity-70">Не передан параметр id дашборда.</p>
            </div>
          </div>
        </body>
      </html>
    )
  }

  let dashboard: any = null
  let datasets: any[] = []

  try {
    const foundDashboard = await AnalyticsDashboards.findById(ctx, dashboardId)
    if (!foundDashboard) {
      Debug.warn(ctx, `[dashboard-view] дашборд ${dashboardId} не найден`)
    } else {
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
      `[dashboard-view] ошибка при загрузке дашборда ${dashboardId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }

  try {
    datasets = await AnalyticsDatasets.findAll(ctx, {
      order: { createdAt: 'desc' }
    })
  } catch (error) {
    Debug.error(
      ctx,
      `[dashboard-view] не удалось загрузить датасеты: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }

  return (
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>
          {projectName} - {dashboard ? `Дашборд: ${dashboard.name}` : 'Дашборд не найден'}
        </title>

        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        {/* @ts-expect-error - dangerouslySetInnerHTML is supported in Chatium JSX for script tags */}
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
            pageTitle={dashboard ? `Дашборд: ${dashboard.name}` : 'Дашборд не найден'}
          />
          <div class="flex-1">
            <DashboardViewPage
              initialDashboard={dashboard}
              datasets={datasets}
              initialMetrics={[]}
              apiUrls={{}}
            />
          </div>
          <Footer licenseUrl={licensePageRoute.url()} />
        </div>
      </body>
    </html>
  )
})

export default dashboardViewRoute
