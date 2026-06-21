import { jsx } from '@app/html-jsx'
import { Styles } from './styles'
import HomePage from './pages/HomePage.vue'
import { getWorkspaceEventUrl } from '@start/sdk'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html lang="ru">
      <head>
        <title>Make-Up Studio | Профессиональный макияж в Москве</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Профессиональный визажист в Москве. Дневной, вечерний и свадебный макияж. Более 7 лет опыта. Записывайтесь онлайн!"
        />
        <script src="/s/metric/clarity.js"></script>
        <Styles />
      </head>
      <body>
        <HomePage />
      </body>
    </html>
  )
})

app.accountHook('@start/agent/events', async (ctx, params) => {
  return [
    {
      name: 'Создана запись на прием',
      url: await getWorkspaceEventUrl(ctx, 'appointment_created')
    }
  ]
})
