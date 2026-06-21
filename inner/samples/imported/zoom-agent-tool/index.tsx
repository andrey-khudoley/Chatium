import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import { settingsRoute } from './settings'
import ZoomSettings from './tables/zoom_settings.table'

export const indexRoute = app.get('/', async (ctx, req) => {
  const isAdmin = ctx.user?.is('Admin') ?? false

  const settings = await ZoomSettings.findOneBy(ctx, { id: { $not: null } })
  const isConfigured =
    settings && settings.account_id && settings.client_id && settings.client_secret

  return (
    <html>
      <head>
        <title>Zoom Agent Tool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
      </head>
      <body class="bg-gray-50 min-h-screen">
        <div class="max-w-4xl mx-auto py-12 px-4">
          {/* Header */}
          <div class="text-center mb-12">
            <div class="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i class="fas fa-video text-white text-3xl"></i>
            </div>
            <h1 class="text-4xl font-bold text-gray-900 mb-4">Zoom Agent Tool</h1>
            <p class="text-xl text-gray-600">Интеграция Zoom для AI-агентов</p>
          </div>

          {/* Features Grid */}
          <div class="grid md:grid-cols-2 gap-6 mb-12">
            {/* Create Meeting Feature */}
            <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <i class="fas fa-plus-circle text-green-600 text-xl"></i>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Создание встреч</h3>
              <p class="text-gray-600 text-sm mb-4">
                AI-агент может создавать Zoom-встречи с заданными параметрами: тема, повестка,
                длительность и настройки записи.
              </p>
              <div class="flex flex-wrap gap-2">
                <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  zoomAgentCreateMeeting
                </span>
              </div>
            </div>

            {/* List Recordings Feature */}
            <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <i class="fas fa-film text-purple-600 text-xl"></i>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Записи встреч</h3>
              <p class="text-gray-600 text-sm mb-4">
                Просмотр облачных записей Zoom-встреч за последние 30 дней с ссылками для
                скачивания.
              </p>
              <div class="flex flex-wrap gap-2">
                <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  zoomAgentListRecordings
                </span>
              </div>
            </div>
          </div>

          {/* Admin Section */}
          {isAdmin && (
            <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-cog text-blue-600"></i>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Настройки интеграции</h3>
                    <p class="text-gray-500 text-sm">
                      Настройка API-ключей и параметров по умолчанию
                    </p>
                  </div>
                </div>
                <a
                  href={settingsRoute.url()}
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <i class="fas fa-sliders-h"></i>
                  Настроить
                </a>
              </div>

              {isConfigured ? (
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div class="flex items-start gap-3">
                    <i class="fas fa-check-circle text-green-600 mt-0.5"></i>
                    <div>
                      <p class="text-green-800 font-medium">Интеграция настроена</p>
                      <p class="text-green-700 text-sm">
                        API-ключи Zoom успешно добавлены. Инструменты готовы к работе.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div class="flex items-start gap-3">
                    <i class="fas fa-exclamation-triangle text-amber-600 mt-0.5"></i>
                    <div>
                      <p class="text-amber-800 font-medium">Требуется настройка</p>
                      <p class="text-amber-700 text-sm">
                        Для работы интеграции необходимо настроить API-ключи Zoom. Получите
                        credentials в
                        <a
                          href="https://marketplace.zoom.us/user/build"
                          target="_blank"
                          class="underline"
                        >
                          Zoom Marketplace
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Non-admin message */}
          {!isAdmin && (
            <div class="bg-gray-100 rounded-xl p-6 text-center">
              <i class="fas fa-lock text-gray-400 text-2xl mb-3"></i>
              <p class="text-gray-600">Настройки доступны только администраторам.</p>
            </div>
          )}

          {/* Footer */}
          <div class="text-center mt-12 text-gray-400 text-sm">
            <p>Zoom Agent Tool — интеграция для Chatium</p>
          </div>
        </div>
      </body>
    </html>
  )
})
