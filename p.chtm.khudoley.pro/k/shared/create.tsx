// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import DocEditPage from './pages/DocEditPage.vue'
import { getDefaultTheme, getHeadContent } from './shared/pageShell'

export const docCreateRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const defaultTheme = await getDefaultTheme(ctx)

  return (
    <html>
      <head>{getHeadContent('Create Document', defaultTheme)}</head>
      <body>
        <DocEditPage />
      </body>
    </html>
  )
})
