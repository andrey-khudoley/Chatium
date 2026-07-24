// @shared
import { jsx } from '@app/html-jsx'
import { ROUTES, withProjectRoot } from './config/routes'

/*
  Корневая страница-заглушка form-gen (§1 спеки). Без Heap и авторизации —
  минимальный маркер того, что каталог обслуживается роутингом (риск плана,
  проверяется деплоем/Runtime Verification первым), по образцу d/system/broker/index.tsx.
*/
export const indexRoute = app.get('/', async () => {
  return (
    <html>
      <head>
        <title>form-gen</title>
        <meta charset="UTF-8" />
      </head>
      <body>
        <h1>form-gen</h1>
        <p>Модуль генерации форм заказа для страниц юнита neso (§1 спеки).</p>
        <p>
          <a href={withProjectRoot(ROUTES.admin)}>Админ-панель</a>
        </p>
      </body>
    </html>
  )
})
