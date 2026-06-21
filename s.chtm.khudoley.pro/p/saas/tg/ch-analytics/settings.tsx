// @shared
import { jsx } from '@app/html-jsx'
import { requireRealUser } from '@app/auth'
import SettingsPage from './pages/SettingsPage.vue'
import { TgChannelAnalyticsSettings, ensureDefaultSettings } from './tables/settings.table'
import { loginPageRoute } from './login'
import { applyDebugLevel } from './lib/logging'
import { Debug } from './shared/debug'

export const settingsPageRoute = app.html('/', async (ctx, req) => {
  // Применяем уровень логирования из настроек
  await applyDebugLevel(ctx, 'settings')
  Debug.info(ctx, '[settings] Начало обработки страницы настроек')

  try {
    requireRealUser(ctx)
    Debug.info(ctx, `[settings] Пользователь авторизован: userId=${ctx.user.id}`)
  } catch (error: any) {
    Debug.warn(ctx, `[settings] Пользователь не авторизован, перенаправление на страницу входа`)
    Debug.warn(ctx, `[settings] Ошибка авторизации: ${error?.message || 'Unknown error'}`)
    const loginUrl = loginPageRoute.url() + '?back=' + encodeURIComponent(req.url)
    return (
      <html>
        <head>
          <meta http-equiv="refresh" content={`0; url=${loginUrl}`} />
        </head>
        <body>
          <p>Перенаправление на страницу входа...</p>
        </body>
      </html>
    )
  }

  await ensureDefaultSettings(ctx)
  Debug.info(ctx, '[settings] Настройки по умолчанию проверены')
  Debug.info(ctx, '[settings] Загрузка всех настроек из базы данных')
  const settings = await TgChannelAnalyticsSettings.findAll(ctx, {})
  Debug.info(ctx, `[settings] Загружено настроек: ${settings.length}`)

  const titleSetting = settings.find((s) => s.key === 'project_title')
  const projectTitle = titleSetting?.value || 'Аналитика телеграм-каналов'
  Debug.info(ctx, `[settings] Название проекта: ${projectTitle}`)

  Debug.info(ctx, '[settings] Рендеринг страницы настроек')
  return (
    <html>
      <head>
        <title>{projectTitle} - Настройки</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
        <style>{`
          /* Стилизация выделения текста */
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
        <SettingsPage settings={settings} projectTitle={projectTitle} />
      </body>
    </html>
  )
})
