import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import GeneratorPage from './pages/GeneratorPage.vue'
import GalleryPage from './pages/GalleryPage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  if (req.query.gallery !== undefined) {
    return (
      <html>
        <head>
          <title>Генератор медиа </title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="/s/metric/clarity.js"></script>
          <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        </head>
        <body>
          <GalleryPage />
        </body>
      </html>
    )
  }

  requireAccountRole(ctx, 'Admin')

  return (
    <html>
      <head>
        <title>AI Creative Studio - Генератор медиа</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  dark: {
                    DEFAULT: '#0a0a0f',
                    card: 'rgba(17, 17, 24, 0.8)',
                  },
                  purple: {
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8b5cf6',
                    600: '#7c3aed',
                  },
                  cyan: {
                    300: '#67e8f9',
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                  },
                  emerald: {
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                  },
                  amber: {
                    300: '#fcd34d',
                    500: '#f59e0b',
                  }
                },
                fontFamily: {
                  sans: ['Inter', 'system-ui', 'sans-serif'],
                  display: ['Inter', 'system-ui', 'sans-serif'],
                }
              }
            }
          }
        `}</script>
        <script src="/s/metric/clarity.js"></script>
        <style>{`
          * {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          body {
            font-family: 'Inter', system-ui, sans-serif;
          }
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.05);
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.3);
          }
        `}</style>
      </head>
      <body class="bg-dark">
        <GeneratorPage />
      </body>
    </html>
  )
})
