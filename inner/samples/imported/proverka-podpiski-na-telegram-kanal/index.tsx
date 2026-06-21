import { jsx } from '@app/html-jsx'
import SettingsPage from './pages/SettingsPage.vue'
import './bot/handler' // Подключаем обработчик сообщений бота

// @shared-route
export const indexRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Настройки Телеграм-бота</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'primary': '#0088cc',
                  'secondary': '#0066aa',
                  'accent': '#54a9eb',
                  'telegram': '#0088cc',
                  'success': '#10B981',
                  'danger': '#EF4444',
                  'warning': '#F59E0B',
                }
              }
            }
          }
        `}</script>
      </head>
      <body>
        <SettingsPage />
      </body>
    </html>
  )
})
