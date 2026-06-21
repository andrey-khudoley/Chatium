import { jsx } from '@app/html-jsx'

/**
 * Страница-заглушка для тестов роута редиректа: GET /web/tests/redirect-landing?ref=…
 * Используется как urlTemplate в тестах redirect-route вместо example.com, чтобы при следовании
 * редиректу получать 200 с нашего сервера, а не 404 с внешнего домена.
 */
export const redirectLandingRoute = app.html('/', async (ctx, req) => {
  const ref = (req.query?.ref as string) ?? ''
  return (
    <html>
      <head>
        <title>Тестовая посадочная</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <h1>Тестовая посадочная</h1>
        <p>ref={ref || '(не передан)'}</p>
      </body>
    </html>
  )
})

export default redirectLandingRoute
