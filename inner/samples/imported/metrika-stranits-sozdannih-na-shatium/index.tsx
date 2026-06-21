import { jsx } from '@app/html-jsx'
import AnalyticsPage from './pages/AnalyticsPage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Аналитика вовлеченности</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script src="/s/metric/clarity.js"></script>
        <style type="text/tailwindcss">{`
          @layer base {
            body {
              @apply bg-gray-50 text-gray-900;
            }
          }
        `}</style>
      </head>
      <body>
        <AnalyticsPage />
      </body>
    </html>
  )
})
