// @shared
import { jsx } from '@app/html-jsx'
import TestLanding from './pages/TestLanding.vue'
import { Styles } from './styles'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Тест скорости мастера маникюра | Марафон по скоростному наращиванию</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Узнайте свой уровень скорости работы и потенциал заработка. Пройдите тест и получите приглашение на марафон по скоростному наращиванию на верхние формы."
        />
        <Styles />
        <script src="/s/metric/clarity.js"></script>
      </head>
      <body>
        <TestLanding />
      </body>
    </html>
  )
})
