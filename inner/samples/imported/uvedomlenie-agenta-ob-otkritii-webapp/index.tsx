import { jsx } from '@app/html-jsx'
import SettingsPage from './pages/SettingsPage.vue'
import GalleryPage from './pages/GalleryPage.vue'
import { requireAccountRole } from '@app/auth'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  // Демонстрационная страница для галереи
  if (req.query.gallery !== undefined) {
    return (
      <html>
        <head>
          <title>WebApp Opened Events - Демо</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        </head>
        <body>
          <GalleryPage />
        </body>
      </html>
    )
  }

  // Страница настроек для администратора
  await requireAccountRole(ctx, 'Admin')

  return (
    <html>
      <head>
        <title>Настройки WebApp Opened</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/metric/clarity.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <style type="text/tailwindcss">{`
          body {
            --color-primary: #1E40AF;
            --color-secondary: #1E3A8A;
            --color-accent: #3B82F6;
            --font-sans: system-ui, -apple-system, sans-serif;
          }
        `}</style>
      </head>
      <body>
        <SettingsPage />
      </body>
    </html>
  )
})
