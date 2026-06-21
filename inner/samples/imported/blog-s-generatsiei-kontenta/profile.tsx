import { jsx } from '@app/html-jsx'
import { requireRealUser } from '@app/auth'
import ProfilePage from './pages/ProfilePage.vue'

export const profilePageRoute = app.get('/', async (ctx, req) => {
  requireRealUser(ctx)

  return (
    <html>
      <head>
        <title>Профиль - {ctx.user.displayName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <style type="text/tailwindcss">{`
          body {
            --font-sans: Inter, sans-serif;
            --color-primary: #2563eb;
            --color-success: #10b981;
            --color-danger: #ef4444;
          }
        `}</style>
      </head>
      <body class="bg-gray-50 min-h-screen">
        <ProfilePage />
      </body>
    </html>
  )
})
