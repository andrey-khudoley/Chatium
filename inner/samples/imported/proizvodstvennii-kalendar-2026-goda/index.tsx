// @shared
import { jsx } from '@app/html-jsx'
import Calendar2026 from './pages/Calendar2026.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Производственный календарь 2026</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Производственный календарь на 2026 год для России. Рабочие дни, выходные и праздники."
        />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script src="/s/metric/clarity.js"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#3b82f6',
                  secondary: '#8b5cf6',
                }
              }
            }
          }
        `}</script>
        <style type="text/tailwindcss">{`
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
          }
        `}</style>
      </head>
      <body>
        <Calendar2026 />
      </body>
    </html>
  )
})
