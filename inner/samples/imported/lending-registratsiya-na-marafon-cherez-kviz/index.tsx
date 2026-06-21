// @shared
import { jsx } from '@app/html-jsx'
import QuizPage from './pages/QuizPage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Тест для мастеров - Получи премиальный урок бесплатно</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Пройди короткий тест и получи бесплатный урок по работе с травмированными ногтями и скоростному наращиванию"
        />
        <script src="/s/metric/clarity.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#ec4899',
                  secondary: '#9333ea',
                },
                fontFamily: {
                  sans: ['Inter', 'sans-serif'],
                }
              }
            }
          }
        `}</script>
      </head>
      <body>
        <QuizPage />
      </body>
    </html>
  )
})
