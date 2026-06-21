import { jsx } from '@app/html-jsx'
// @ts-ignore
import MainPage from './pages/MainPage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Мастер маникюра - Профессиональный уход за ногтями</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Профессиональный маникюр и педикюр. Качественные услуги, современные техники, уютная атмосфера. Запись онлайн."
        />
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
            }

            h1, h2, h3 {
              font-family: 'Playfair Display', serif;
            }
          }
        `}</style>
      </head>
      <body>
        <MainPage />
      </body>
    </html>
  )
})
