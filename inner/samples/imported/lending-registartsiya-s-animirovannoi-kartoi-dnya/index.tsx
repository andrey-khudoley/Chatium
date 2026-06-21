// @shared
import { jsx } from '@app/html-jsx'
import CardOfDayPage from './pages/CardOfDayPage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Карта Дня Мастера | Узнай свой путь к успеху</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Вытяни карту дня и узнай, что звезды приготовили для твоего маникюрного бизнеса. Получи персональное послание и открой путь к успеху."
        />

        {/* Tailwind CSS */}
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#9333EA',
                  secondary: '#EC4899',
                }
              }
            }
          }
        `}</script>

        {/* Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* Font Awesome */}
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />

        {/* Метрики */}
        <script src="/s/metric/clarity.js"></script>

        <style type="text/tailwindcss">{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
          }

          html, body {
            height: 100%;
            width: 100%;
          }
        `}</style>
      </head>
      <body>
        <CardOfDayPage />
      </body>
    </html>
  )
})
