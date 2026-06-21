import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import SettingsPage from './pages/SettingsPage.vue'

export const settingsRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  return (
    <html>
      <head>
        <title>Настройки Zoom</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
      </head>
      <body>
        <SettingsPage />
      </body>
    </html>
  )
})
