// @shared
import { jsx } from '@app/html-jsx'
import DocsPage from './pages/DocsPage.vue'
import { getPreloaderStyles, getPreloaderScript } from './shared/preloader'
import { customScrollbarStyles, lightThemeVariables } from './styles'
import { INDEX_PAGE_NAME, getPageTitle, DEFAULT_PROJECT_TITLE } from './config/project'
import { loadOpenApiSchema } from './lib/openapi.lib'

export const indexPageRoute = app.html('/', async (ctx) => {
  const apiDocs = await loadOpenApiSchema(ctx)
  const groupsCount = apiDocs.groups.length
  ctx.account.log('Рендер страницы документации', { level: 'info', json: { groupsCount } })

  const projectTitle = getPageTitle(INDEX_PAGE_NAME, DEFAULT_PROJECT_TITLE)

  return (
    <html>
      <head>
        <title>{projectTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <style>{`
          html, body { margin: 0; min-height: 100%; }
          * { box-sizing: border-box; }
          body {
            min-height: 100vh;
            background:
              radial-gradient(1200px 520px at 0% -10%, rgba(143, 204, 255, 0.38), transparent 60%),
              radial-gradient(900px 460px at 100% 0%, rgba(214, 232, 255, 0.65), transparent 58%),
              linear-gradient(180deg, #f7faff 0%, var(--color-bg) 42%, #ecf3ff 100%);
            color: var(--color-text);
            font-family: var(--font-body);
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
          code, pre { font-family: var(--font-mono); }
          body.boot-complete { overflow: auto; }
          ${getPreloaderStyles()}
          ${lightThemeVariables}
          ${customScrollbarStyles}
        `}</style>
        <script>{getPreloaderScript()}</script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div id="boot-loader">
          <div class="boot-messages">
            <div class="boot-spinner"></div>
            <div>Загрузка документации...</div>
          </div>
        </div>
        <DocsPage apiDocs={apiDocs} projectTitle={projectTitle} />
      </body>
    </html>
  )
})

export default indexPageRoute
