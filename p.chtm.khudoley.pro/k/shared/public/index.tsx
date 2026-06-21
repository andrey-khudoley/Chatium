// @shared
import { requireAccountRole } from '@app/auth'
import { jsx } from '@app/html-jsx'
import PublicDocsPage from '../pages/PublicDocsPage.vue'
import { listSharedDocsRoute } from '../api/docs'
import { getDefaultTheme, getHeadContent, normalizeInstructionQuery, type SsrDocListItem } from '../shared/pageShell'

function isAdmin(ctx: any): boolean {
  try {
    requireAccountRole(ctx, 'Admin')
    return true
  } catch {
    return false
  }
}

export const publicPageRoute = app.get('/', async (ctx, req) => {
  const defaultTheme = await getDefaultTheme(ctx)
  const instruction = normalizeInstructionQuery(req.query.s, req.query.instruction)
  const admin = isAdmin(ctx)

  let ssrDocs: SsrDocListItem[] = []
  let ssrDocsError = ''

  try {
    const listResult = await listSharedDocsRoute.query({ s: instruction }).run(ctx)
    if (listResult.success && Array.isArray(listResult.data?.items)) {
      ssrDocs = listResult.data.items as SsrDocListItem[]
    } else {
      ssrDocsError = listResult.error || 'Failed to load public docs'
    }
  } catch (error) {
    ssrDocsError = String(error)
  }

  const pageTitle = instruction === 'shared'
    ? 'Public Knowledge'
    : `Knowledge by @${instruction}`

  return (
    <html>
      <head>{getHeadContent(pageTitle, defaultTheme)}</head>
      <body>
        <script>{`
          window.__SSR_SHARED_DOCS__ = ${JSON.stringify(ssrDocs)};
          window.__SSR_SHARED_DOCS_ERROR__ = ${JSON.stringify(ssrDocsError)};
          window.__SSR_SHARED_INSTRUCTION__ = ${JSON.stringify(instruction)};
          window.__SSR_IS_ADMIN__ = ${JSON.stringify(admin)};
        `}</script>
        <PublicDocsPage
          initialDocuments={ssrDocs}
          initialInstruction={instruction}
          initialError={ssrDocsError || undefined}
          initialIsAdmin={admin}
        />
      </body>
    </html>
  )
})
