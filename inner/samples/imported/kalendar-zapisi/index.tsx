import { jsx } from '@app/html-jsx'
import ClientBooking from './pages/ClientBooking.vue'

export const bookingIndexRoute = app.html('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Запись на встречу</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/metric/clarity.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <style type="text/tailwindcss">{`
          @layer base {
            html, body, #app {
              height: 100%;
              margin: 0;
              padding: 0;
            }
          }
        `}</style>
      </head>
      <body>
        <ClientBooking />
      </body>
    </html>
  )
})
