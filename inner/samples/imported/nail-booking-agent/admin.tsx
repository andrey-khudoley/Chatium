import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
// @ts-ignore
import AdminPage from './pages/AdminPage.vue'

export const adminPageRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  return (
    <html>
      <head>
        <title>Панель администратора - Управление записями</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/metric/clarity.js"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#d4869c',
                  secondary: '#f3e5dc',
                  accent: '#b66d85',
                  dark: '#2c2c2c',
                }
              },
              fontFamily: {
                display: ['Playfair Display', 'serif'],
                sans: ['Inter', 'sans-serif'],
              }
            }
          }
        `}</script>
        <style type="text/tailwindcss">{`
          @layer base {
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              background: #f8f9fa;
            }

            h1, h2, h3 {
              font-family: 'Playfair Display', serif;
            }
          }
        `}</style>
      </head>
      <body>
        <AdminPage />
      </body>
    </html>
  )
})
