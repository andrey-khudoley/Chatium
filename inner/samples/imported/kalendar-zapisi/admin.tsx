import { jsx } from '@app/html-jsx'
import { requireRealUser } from '@app/auth'
import AdminDashboard from './pages/AdminDashboard.vue'

import { bookingIndexRoute } from './index'

export const adminRoute = app.html('/', async (ctx, req) => {
  requireRealUser(ctx)

  return (
    <html>
      <head>
        <title>Администрация календаря</title>
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
        <AdminDashboard />
      </body>
    </html>
  )
})
