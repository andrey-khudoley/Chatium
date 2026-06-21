import { jsx } from '@app/html-jsx'
import SettingsPage from './pages/SettingsPage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Настройки инструмента отправки в Telegram</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <style type="text/tailwindcss">{`
          body {
            --color-primary: #0088cc;
            --color-secondary: #1E3A8A;
            --color-accent: #3B82F6;
            --color-dark: #111827;
            --color-light: #F3F4F6;
            --color-success: #10B981;
            --color-danger: #EF4444;
            --color-warning: #F59E0B;
            --color-info: #3B82F6;
            --font-sans: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;
          }
        `}</style>
      </head>
      <body class="bg-gray-50 min-h-screen">
        <SettingsPage />
      </body>
    </html>
  )
})
