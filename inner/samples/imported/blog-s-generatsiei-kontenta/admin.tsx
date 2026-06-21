import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import BlogAdminPage from './pages/BlogAdminPage.vue'

export const blogAdminRoute = app.get('/admin', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  return (
    <html>
      <head>
        <title>Админка блога - Персональный блог</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <style type="text/tailwindcss">{`
          body {
            --color-primary: #2563eb;
            --color-secondary: #1e40af;
            --color-accent: #3b82f6;
            --color-dark: #111827;
            --color-light: #f8fafc;
            --font-sans: Inter, sans-serif;
          }
        `}</style>
      </head>
      <body class="bg-gray-50 min-h-screen">
        <BlogAdminPage />
      </body>
    </html>
  )
})
