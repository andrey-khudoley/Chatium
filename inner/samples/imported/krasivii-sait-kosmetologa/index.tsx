import { jsx } from '@app/html-jsx'
import { styles } from './styles'
import MainPage from './pages/MainPage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html lang="ru">
      <head>
        <title>Beauty Studio - Профессиональная косметология</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Профессиональная косметология: чистка лица, инъекции красоты, массажи, пилинги. Индивидуальный подход и качественные процедуры."
        />
        <script src="/s/metric/clarity.js"></script>
        {styles}
      </head>
      <body>
        <MainPage />
      </body>
    </html>
  )
})
