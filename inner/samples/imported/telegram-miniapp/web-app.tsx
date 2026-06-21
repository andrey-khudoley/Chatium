// @shared
import { jsx } from '@app/html-jsx'
import WebAppIndex from './pages/WebAppIndex.vue'

export const webAppPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Telegram MiniApp</title>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script src="/s/metric/clarity.js"></script>
        <style type="text/tailwindcss">{`
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background-color: #f8f9fa;
          }
        `}</style>
        <script>{`
          window.addEventListener('DOMContentLoaded', function() {
            if (window.Telegram && window.Telegram.WebApp) {
              const tg = window.Telegram.WebApp;
              tg.expand();
              tg.ready();
              window.tg = tg;
            }
          });
        `}</script>
      </head>
      <body>
        <WebAppIndex />
      </body>
    </html>
  )
})
