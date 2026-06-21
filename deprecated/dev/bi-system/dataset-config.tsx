// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import { AnalyticsDatasets } from './tables/datasets.table'
import DatasetConfigPage from './pages/DatasetConfigPage.vue'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import { apiDatasetCreateRoute, apiDatasetUpdateByIdRoute } from './api/datasets'
import { indexPageRoute } from './index'
import { licensePageRoute } from './license'
import { settingsPageRoute } from './settings'
import { Debug } from './shared/debug'
import { applyDebugLevel } from './lib/logging'
import { tailwindScript, cssVariables, commonStyles } from './styles'
import { getProjectName } from './shared/projectName'

/**
 * Страница конфигурации датасета
 * Путь: /dev/partnership/dataset-config
 * С параметром ?id=xxx - редактирование существующего датасета
 * Без параметра - создание нового датасета
 */
export const datasetConfigRoute = app.html('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'dataset-config-page')
  Debug.info(ctx, '[dataset-config] открытие страницы конфигурации')

  const projectName = await getProjectName(ctx)
  const datasetId = req.query.id as string | undefined
  let dataset = null

  // Если есть ID, загружаем существующий датасет
  if (datasetId) {
    try {
      Debug.info(ctx, `[dataset-config] загрузка датасета ${datasetId}`)
      const foundDataset = await AnalyticsDatasets.findById(ctx, datasetId)
      if (foundDataset) {
        dataset = {
          id: foundDataset.id,
          name: foundDataset.name,
          description: foundDataset.description,
          config: foundDataset.config,
          createdAt: foundDataset.createdAt,
          updatedAt: foundDataset.updatedAt
        }
      }
    } catch (error) {
      Debug.error(
        ctx,
        `[dataset-config] не удалось загрузить датасет ${datasetId}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // Генерируем URL на сервере для передачи в клиент
  // Для route с параметрами не генерируем URL через .url(), а передаём шаблон строкой
  const apiUrls = {
    create: apiDatasetCreateRoute.url(),
    update: apiDatasetUpdateByIdRoute.url(),
    // Передаём шаблон URL как строку, параметр :datasetId будет заменён на клиенте
    componentCounts: '/api/datasets/component-counts/:datasetId',
    indexPage: indexPageRoute.url(),
    datasetConfig: datasetConfigRoute.url()
  }

  return (
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>
          {projectName} - {dataset ? `Редактирование: ${dataset.name}` : 'Создание датасета'}
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
            pageTitle={dataset ? `Редактирование: ${dataset.name}` : 'Создание датасета'}
          />
          <div class="flex-1">
            <DatasetConfigPage initialDataset={dataset} apiUrls={apiUrls} />
          </div>
          <Footer licenseUrl={licensePageRoute.url()} />
        </div>
      </body>
    </html>
  )
})

export default datasetConfigRoute
