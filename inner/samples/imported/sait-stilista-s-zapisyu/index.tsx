import { jsx } from '@app/html-jsx'
import MainPage from './pages/MainPage.vue'
import { StylesHead } from './styles'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html lang="ru">
      <head>
        <title>Анна Стилист | Создание уникальных образов</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Профессиональный стилист с 10-летним опытом. Разбор гардероба, шоппинг-сопровождение, создание образов. Запишитесь на консультацию!"
        />
        <script src="/s/metric/clarity.js"></script>
        <StylesHead />
      </head>
      <body>
        <MainPage />
      </body>
    </html>
  )
})
