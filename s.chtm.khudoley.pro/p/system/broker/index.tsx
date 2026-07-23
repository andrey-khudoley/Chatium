// @shared
import { jsx } from '@app/html-jsx'
import { ROUTES, withProjectRoot } from './config/routes'

/*
  Корневая страница-заглушка брокера (§1). Без Heap и авторизации — минимальный
  маркер того, что каталог d/system/broker обслуживается роутингом (риск плана,
  проверяется деплоем/Runtime Verification первым).
*/
export const indexRoute = app.get('/', async () => {
  return (
    <html>
      <head>
        <title>broker</title>
        <meta charset="UTF-8" />
      </head>
      <body>
        <h1>broker</h1>
        <p>Аккаунт-глобальный брокер событий (§1 спеки).</p>
        <p>
          <a href={withProjectRoot(ROUTES.tests)}>Тесты</a>
        </p>
        <p>
          <a href={withProjectRoot(ROUTES.admin)}>Панель наблюдаемости</a>
        </p>
      </body>
    </html>
  )
})
