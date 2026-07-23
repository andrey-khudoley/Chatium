// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import { genSocketId } from '@app/socket'
import AdminPage from '../../pages/admin/AdminPage.vue'
import { LOG_SOCKET_CHANNEL } from '../../config/env'

/**
 * Админ-панель наблюдаемости (§5.11, волна 2.5) — статус/метрики/живой монитор
 * логов поверх уже принятых механизмов волны 2. requireAccountRole ПЕРВОЙ
 * строкой (жёсткий инвариант; по образцу web/tests/index.tsx).
 */
export const brokerAdminPageRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  const encodedLogsSocketId = await genSocketId(ctx, LOG_SOCKET_CHANNEL)

  return (
    <html>
      <head>
        <title>broker — Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
      </head>
      <body>
        <AdminPage encodedLogsSocketId={encodedLogsSocketId} />
      </body>
    </html>
  )
})
