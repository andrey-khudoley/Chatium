// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import DocViewPage from './pages/DocViewPage.vue'
import { getDocRoute } from './api/docs'
import { stripInstructions } from './shared/instructionParser'
import { renderMarkdownToHtml } from './shared/markdownRenderer'
import { getDefaultTheme, getHeadContent, isTruthyQuery } from './shared/pageShell'
import { listPageRoute } from './list'
import { publicPageRoute } from './public'

/**
 * Роут индекса: ?f= — просмотр документа. Без f — редирект на /list или /shared.
 * Публичная ссылка: ?f=filename (без доп. параметров). Внутренняя (админ): ?f=filename&admin=1, требует авторизацию.
 */
export const indexPageRoute = app.get('/', async (ctx, req) => {
  const filename = String(req.query.f || req.query.filename || '').trim()
  const isAdminView = isTruthyQuery(req.query.admin)
  const isPublic = !isAdminView

  if (!filename) {
    return ctx.resp.redirect(isAdminView ? listPageRoute.url() : publicPageRoute.url())
  }

  if (isAdminView) {
    requireAccountRole(ctx, 'Admin')
  }

  const defaultTheme = await getDefaultTheme(ctx)

  let ssrMarkdown = ''
  let ssrHtml = ''
  let ssrError = ''

  try {
    const result = await getDocRoute.query({ filename }).run(ctx)

    if (result.success && typeof result.data === 'string') {
      ssrMarkdown = result.data
      const contentWithoutInstructions = stripInstructions(ssrMarkdown)
      ssrHtml = await renderMarkdownToHtml(contentWithoutInstructions)
    } else {
      ssrError = result.error === 'NotFound'
        ? 'Document not found'
        : (result.error || 'Failed to load document')
    }
  } catch (error) {
    ssrError = String(error)
  }

  const title = `Knowledge Reader: ${filename}`

  return (
    <html>
      <head>
        {getHeadContent(title, defaultTheme)}
        <meta name="description" content={`Knowledge document: ${filename}`} />
      </head>
      <body>
        <script>{`
          window.__SSR_MARKDOWN__ = ${JSON.stringify(ssrMarkdown)};
          window.__SSR_HTML__ = ${JSON.stringify(ssrHtml)};
          window.__SSR_ERROR__ = ${JSON.stringify(ssrError)};
        `}</script>
        <DocViewPage
          documentFilename={filename}
          isPublic={isPublic}
          ssrContent={ssrMarkdown}
          ssrHtml={ssrHtml}
          ssrError={ssrError || undefined}
        />
      </body>
    </html>
  )
})

/** Тот же роут: URL просмотра документа — индекс с параметром ?f= */
export const docViewRoute = indexPageRoute
