import { jsx } from '@app/html-jsx'
import { StylesHead } from './styles'
import HomePage from './pages/HomePage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html lang="ru">
      <head>
        <title>БолтПром - Производство высококачественных крепежных изделий</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="БолтПром - ведущий производитель болтов, гаек и крепежных изделий. Высокое качество, современное производство, доступные цены."
        />
        <StylesHead />
      </head>
      <body class="bg-gray-50">
        <HomePage />
      </body>
    </html>
  )
})
