import { jsx } from '@app/html-jsx'
import WheelPage from './pages/WheelPage.vue'
import { getLogLevelForPage, getLogLevelScript } from './shared/logLevel'
import { wheelPageCss1 } from './pagecss/wheelPageCss1'
import { wheelPageCss2 } from './pagecss/wheelPageCss2'

export const indexPageRoute = app.html('/', async (ctx) => {
  const logLevel = await getLogLevelForPage(ctx)

  return (
    <html lang="ru">
      <head>
        <title>Колесо удачи</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script>{getLogLevelScript(logLevel)}</script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Jost:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <script src="/s/metric/clarity.js"></script>
        <style>
          {wheelPageCss1}
          {wheelPageCss2}
        </style>
      </head>
      <body>
        <WheelPage />
      </body>
    </html>
  )
})

export default indexPageRoute
