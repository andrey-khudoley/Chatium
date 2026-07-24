// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import AdminPage from '../../pages/admin/AdminPage.vue'
import { getGcSettings } from '../../lib/settings/gcSettings'
import { FormsTable } from '../../tables/forms.table'
import { ROUTE_PATHS, getFullUrl } from '../../config/routes'

/**
 * Админ-страница form-gen (§5.3 спеки): настройки GC + генератор форм.
 * requireAccountRole ПЕРВОЙ строкой (жёсткий инвариант, роль 'Admin' — дельта 4
 * плана). Admin API вызывается из AdminPage.vue через fetch (same-origin,
 * дельта 5) — URL ОБЯЗАТЕЛЬНО абсолютные от корня домена (getFullUrl), НЕ
 * withProjectRoot: тот возвращает относительный `./...`, а нативный fetch из
 * Vue резолвит относительный путь от текущего URL страницы (`.../web/admin`),
 * что даёт удвоенный путь и 404 (fix-цикл ревью, п.1).
 */
export const adminPageRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  const [gcSettings, forms] = await Promise.all([
    getGcSettings(ctx),
    FormsTable.findAll(ctx, { order: [{ createdAt: 'desc' }], limit: 200 })
  ])

  ctx.account.log('form-gen: admin.opened', { level: 'debug', json: { formsCount: forms.length } })

  return (
    <html>
      <head>
        <title>form-gen — Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
      </head>
      <body>
        <AdminPage
          initialSettings={gcSettings}
          saveSettingsUrl={getFullUrl(ROUTE_PATHS.saveSettings)}
          createFormUrl={getFullUrl(ROUTE_PATHS.createForm)}
          forms={forms}
        />
      </body>
    </html>
  )
})
