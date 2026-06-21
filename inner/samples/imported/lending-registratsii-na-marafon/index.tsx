// @shared
import { jsx } from '@app/html-jsx'
import { EventStyles } from './styles'
import EventLanding from './pages/EventLanding.vue'
import { getWorkspaceEventUrl } from '@start/sdk'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html lang="ru">
      <head>
        <title>EMI Beauty Master Class - Мероприятие для мастеров маникюра</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Прорывной бьюти-ивент 11-13 ноября. 4 мастер-класса по дорогим техникам, розыгрыш призов, именной сертификат. Бесплатная регистрация!"
        />
        <meta property="og:title" content="EMI Beauty Master Class - Мероприятие для мастеров" />
        <meta
          property="og:description"
          content="Как стать богатым ТОП-мастером в 2026 году. Пошаговый план + практика от лидеров индустрии"
        />
        <meta property="og:type" content="website" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>💅</text></svg>"
        />
        <EventStyles />
        <script src="/s/metric/clarity.js"></script>
      </head>
      <body>
        <EventLanding />
      </body>
    </html>
  )
})

app.accountHook('@start/agent/events', async (ctx, params) => {
  return [
    {
      name: 'Регистрация на мероприятие EMI',
      url: await getWorkspaceEventUrl(ctx, 'registration')
    }
  ]
})
