// @shared
// @ts-ignore
import { jsx } from '@app/html-jsx'
import AppShell from './pages/AppShell.vue'
import { getGlobalCss } from './styles'
import { bootCss } from './pagecss/boot'
import { getFullUrl, ROUTES } from './config/routes'
import { APP_TITLE } from './config/project'

export const indexPageRoute = app.html('/', async (ctx: any, req: any) => {
  ctx.account.log('bpm.web.index', 'render', { user: ctx.user?.id })

  return (
    <html>
      <head>
        <title>{APP_TITLE}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <style>{bootCss}</style>
        <style>{getGlobalCss()}</style>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
      </head>
      <body>
        <AppShell />
      </body>
    </html>
  )
})

export default indexPageRoute
