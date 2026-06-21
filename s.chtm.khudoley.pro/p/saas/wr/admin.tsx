import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import { headContent } from './styles'
import { indexPageRoute } from './index'
import AdminLayout from './pages/admin/AdminLayout.vue'
import PluginsRequiredPage from './pages/admin/PluginsRequiredPage.vue'
import { apiCheckPluginsRoute } from './api/plugins-check'

export const adminListRoute = app.html('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  // Проверяем установку плагинов на сервере
  const pluginsStatus = await apiCheckPluginsRoute.run(ctx)

  // Проверяем, все ли плагины установлены и настроены
  const allPluginsReady =
    pluginsStatus.kinescope.installed &&
    pluginsStatus.kinescope.configured &&
    pluginsStatus.muuvee.installed &&
    pluginsStatus.knowledge.installed

  // Если плагины не готовы - показываем страницу требования установки
  if (!allPluginsReady) {
    return (
      <html lang="ru">
        <head>
          <title>Требуется установка плагинов — Вебинарная комната</title>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
          />
          <link
            rel="icon"
            type="image/x-icon"
            href="https://fs.chatium.ru/get/image_msk_Rr1014qTrN.256x239.ico"
          />
          {headContent}
        </head>

        <body class="antialiased">
          <PluginsRequiredPage pluginsStatus={pluginsStatus} />
        </body>
      </html>
    )
  }

  // Все плагины готовы - показываем обычную админку
  const section = (req.query.section as string) || 'episodes'
  const episodeId = req.query.episode as string | undefined

  return (
    <html lang="ru">
      <head>
        <title>Админка — Вебинарная комната</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
        />
        <link
          rel="icon"
          type="image/x-icon"
          href="https://fs.chatium.ru/get/image_msk_Rr1014qTrN.256x239.ico"
        />
        {headContent}
      </head>

      <body class="antialiased">
        <AdminLayout
          initialSection={section}
          episodeId={episodeId}
          indexUrl={indexPageRoute.url()}
        />
      </body>
    </html>
  )
})

// Экспорты для обратной совместимости (редиректы на главный маршрут)
export const adminCreateRoute = { url: () => adminListRoute.query({ section: 'create' }).url() }
export const adminFormsRoute = { url: () => adminListRoute.query({ section: 'forms' }).url() }
export const adminSubmissionsRoute = {
  url: () => adminListRoute.query({ section: 'submissions' }).url()
}
export const adminAnalyticsRoute = {
  url: () => adminListRoute.query({ section: 'analytics' }).url()
}
export const adminEditRoute = (params: { id: string }) => ({
  url: () => adminListRoute.query({ section: 'episodes', episode: params.id }).url()
})
