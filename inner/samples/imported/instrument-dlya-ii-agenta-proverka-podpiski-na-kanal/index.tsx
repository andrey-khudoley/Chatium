import { jsx } from '@app/html-jsx'
import SettingsPage from './pages/SettingsPage.vue'

// @shared-route
export const indexPageRoute = app.get('/', async (ctx) => {
  return (
    <html>
      <head>
        <title>Настройки проверки подписки на Telegram-канал</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/metric/clarity.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  telegram: '#0088cc',
                  secondary: '#006699'
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
