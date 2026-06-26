// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import AdminPage from '../../pages/AdminPage.vue'
import { getFullUrl, ROUTES } from '../../config/routes'
import {
  ADMIN_PAGE_NAME,
  DEFAULT_PROJECT_TITLE,
  getPageTitle,
  getHeaderText
} from '../../config/project'
import { writeServerLog } from '../../lib/logger.lib'

const LOG_PATH = 'web/admin/index'

export const adminPageRoute = app.html('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const indexUrl = getFullUrl(ROUTES.index)
  const adminUrl = getFullUrl(ROUTES.admin)

  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Рендер страницы`,
    payload: { indexUrl, adminUrl }
  })

  return (
    <html>
      <head>
        <title>{getPageTitle(ADMIN_PAGE_NAME, DEFAULT_PROJECT_TITLE)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
        <style>{`
          body { margin: 0; padding: 0; background: #f3f4f6; font-family: system-ui, sans-serif; }
        `}</style>
      </head>
      <body>
        <AdminPage
          adminUrl={adminUrl}
          indexUrl={indexUrl}
          projectTitle={getHeaderText(ADMIN_PAGE_NAME, DEFAULT_PROJECT_TITLE)}
          isAdmin={true}
        />
      </body>
    </html>
  )
})

export default adminPageRoute
