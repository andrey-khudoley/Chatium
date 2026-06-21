import { jsx } from '@app/html-jsx'
import SenderBotSettings from './pages/SenderBotSettings.vue'
import GalleryPage from './pages/GalleryPage.vue'
import { getConnectedChannels, getConnectedAgent } from './config/index'
import { requireAccountRole } from '@app/auth'
import { getChannels } from '@sender/sdk'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  // Если есть параметр gallery - показываем страницу галереи без проверки роли
  if (req.query.gallery !== undefined) {
    return (
      <html>
        <head>
          <title>Telegram Web App Bot - Галерея</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="/s/metric/clarity.js"></script>
          <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        </head>
        <body>
          <GalleryPage />
        </body>
      </html>
    )
  }

  await requireAccountRole(ctx, 'Admin')

  const availableChannels = (await getChannels(ctx))
    .map((channel) => ({
      id: channel.id,
      title: channel.title,
      source: channel.source,
      description: channel.description,
      username: channel.username,
      photo: channel.photo,
      active: channel.active
    }))
    .filter((channel) => channel.active)

  return (
    <html>
      <head>
        <title>Настройки Telegram Бота</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/metric/clarity.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <style type="text/tailwindcss">{`
          body {
            --color-primary: #1E40AF;
            --color-secondary: #1E3A8A;
            --color-accent: #3B82F6;
            --color-dark: #111827;
            --color-light: #F3F4F6;
            --color-success: #10B981;
            --color-danger: #EF4444;
            --color-warning: #F59E0B;
            --color-info: #3B82F6;
            --font-sans: system-ui, -apple-system, sans-serif;
          }
        `}</style>
      </head>
      <body>
        <SenderBotSettings
          availableChannels={availableChannels}
          channels={await getConnectedChannels(ctx)}
          agent={await getConnectedAgent(ctx)}
        />
      </body>
    </html>
  )
})
