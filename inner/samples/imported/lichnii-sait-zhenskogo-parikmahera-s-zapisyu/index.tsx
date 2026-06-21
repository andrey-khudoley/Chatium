import { jsx } from '@app/html-jsx'
import { StylesHead } from './styles'
import HomePage from './pages/HomePage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html lang="ru">
      <head>
        <title>Профессиональный парикмахер - Запись онлайн</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Профессиональные парикмахерские услуги. Стрижки, окрашивание, укладки. Запись онлайн."
        />
        <script src="/s/metric/clarity.js"></script>
        <StylesHead />
      </head>
      <body>
        <HomePage />
      </body>
    </html>
  )
})
