// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import DocEditPage from './pages/DocEditPage.vue'
import { getDefaultTheme, getHeadContent } from './shared/pageShell'
import { listPageRoute } from './list'

export const docEditRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const filename = String(req.query.f || req.query.filename || '').trim()
  if (!filename) {
    return ctx.resp.redirect(listPageRoute.url())
  }

  const defaultTheme = await getDefaultTheme(ctx)

  return (
    <html>
      <head>{getHeadContent(`Edit: ${filename}`, defaultTheme)}</head>
      <body>
        <DocEditPage documentFilename={filename} />
      </body>
    </html>
  )
})
