import { jsx } from '@app/html-jsx'
import MainPage from './pages/MainPage.vue'
import { Styles } from './styles'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Nail Master - Профессиональный маникюр</title>
        <meta
          name="description"
          content="Профессиональный маникюр и nail-дизайн. Записывайтесь онлайн!"
        />
        <script src="/s/metric/clarity.js"></script>
        <Styles />
      </head>
      <body>
        <MainPage />
      </body>
    </html>
  )
})
