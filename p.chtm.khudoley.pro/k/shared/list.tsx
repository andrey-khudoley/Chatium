// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import DocsListPage from './pages/DocsListPage.vue'
import { listDocsRoute } from './api/docs'
import { getDefaultTheme, getHeadContent, type SsrDocListItem } from './shared/pageShell'

export const listPageRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const defaultTheme = await getDefaultTheme(ctx)
  let ssrDocs: SsrDocListItem[] = []
  let ssrDocsError = ''

  try {
    const listResult = await listDocsRoute.run(ctx)
    if (listResult.success && Array.isArray(listResult.data?.items)) {
      ssrDocs = listResult.data.items as SsrDocListItem[]
    } else {
      ssrDocsError = listResult.error || 'Failed to load documents'
    }
  } catch (error) {
    ssrDocsError = String(error)
  }

  return (
    <html>
      <head>{getHeadContent('Knowledge Console', defaultTheme)}</head>
      <body>
        <script>{`
          window.__SSR_DOCS__ = ${JSON.stringify(ssrDocs)};
          window.__SSR_DOCS_ERROR__ = ${JSON.stringify(ssrDocsError)};
        `}</script>
        <DocsListPage initialDocuments={ssrDocs} initialError={ssrDocsError || undefined} />
      </body>
    </html>
  )
})
