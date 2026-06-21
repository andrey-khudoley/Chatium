// @shared
import { jsx } from '@app/html-jsx'
import MainPage from './pages/MainPage.vue'
import SettingsPage from './pages/SettingsPage.vue'
import { findDocumentBySlugPath, getDocumentPath, apiDocumentsListRoute } from './api/documents'
import { requireAccountRole } from '@app/auth'
import { initializeDefaultConfig } from './api/config'

/**
 * Get base path for the workspace
 * Returns the workspace path (e.g., '/doc', '/docs', etc.)
 */
export function getBasePath(ctx: app.Ctx): string {
  return '/' + ctx.entryModule.filePath.split('/').slice(0, -1).join('/')
}

// @shared-route
export const apiGetBasePathRoute = app.get('/api/base-path', async (ctx, req) => {
  return { basePath: getBasePath(ctx) }
})

// Общая функция для рендеринга страницы
export async function renderPage(
  ctx: any,
  documentId: string | null,
  slugPath?: string,
  document?: any,
  allDocuments?: any[]
) {
  // Generate meta tags
  const title = document ? `${document.title} - Chatium Documentation` : 'Chatium Documentation'
  const description = document?.mdxCode
    ? document.mdxCode
        .substring(0, 160)
        .replace(/[#*\n]/g, ' ')
        .trim()
    : 'Chatium Documentation - Build powerful apps with Chatium'

  // Use static logo or document image
  const ogImage = document?.imageHash
    ? `https://fs.chatium.io/thumbnail/${document.imageHash}/s/1200x630`
    : 'https://fs.cdn-chatium.io/get/image_gc_dQ8uxvoDUR.512x512.png'

  const url = `https://${ctx.account.hostname}${ctx.req.path}`

  return (
    <html>
      <head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={description} />

        {/* Open Graph tags */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={url} />

        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
        <script src="/s/metric/clarity.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#3b82f6',
                  secondary: '#8b5cf6',
                }
              }
            }
          }
        `}</script>
        <style type="text/tailwindcss">{`
          body {
            --font-sans: 'Inter', sans-serif;
            font-family: var(--font-sans);
            background-color: white;
            color: #333;
          }
          
          .block-editor {
            min-height: 100vh;
          }
          
          .prose {
            max-width: 65ch;
            color: #333;
          }
          
          .prose h1 {
            font-size: 2.25em;
            margin-top: 0;
            margin-bottom: 0.8888889em;
            line-height: 1.1111111;
            color: #333;
          }
          
          .prose h2 {
            font-size: 1.875em;
            margin-top: 1.5555556em;
            margin-bottom: 0.8888889em;
            line-height: 1.3333333;
            color: #333;
          }
          
          .prose p {
            margin-top: 1.25em;
            margin-bottom: 1.25em;
            line-height: 1.75;
            color: #333;
          }
        `}</style>
      </head>
      <body>
        <MainPage
          initialDocumentId={documentId}
          initialSlugPath={slugPath}
          initialDocument={document ? JSON.stringify(document) : null}
          initialAllDocuments={allDocuments ? JSON.stringify(allDocuments) : null}
        />
      </body>
    </html>
  )
}

// Helper function to find first page in document tree
async function findFirstPage(ctx: any, allDocuments: any[]) {
  // Get all pages, filter by published status if not admin
  const isAdmin = ctx.user?.is('Admin')

  const pages = allDocuments
    .filter((doc) => {
      if (doc.type !== 'page') return false
      // Show only published pages for non-admins
      if (!isAdmin && !doc.isPublished) return false
      return true
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  return pages.length > 0 ? pages[0] : null
}

// Settings page (admin only)
export const settingsPageRoute = app.get('/settings', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  // Initialize default config if needed
  await initializeDefaultConfig(ctx)

  const basePath = getBasePath(ctx)
  const title = 'Настройки - Chatium Documentation'

  return (
    <html>
      <head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#3b82f6',
                  secondary: '#8b5cf6',
                }
              }
            }
          }
        `}</script>
        <style type="text/tailwindcss">{`
          body {
            --font-sans: 'Inter', sans-serif;
            font-family: var(--font-sans);
            background-color: #f9fafb;
            color: #333;
          }
        `}</style>
      </head>
      <body>
        <SettingsPage basePath={basePath} />
      </body>
    </html>
  )
})

// Главная страница
export const indexPageRoute = app.get('/', async (ctx, req) => {
  // Initialize default config if needed
  await initializeDefaultConfig(ctx)

  // Load all documents on server
  const allDocuments = await apiDocumentsListRoute.run(ctx)

  // Try to find first page to display automatically
  const firstPage = await findFirstPage(ctx, allDocuments)

  if (firstPage) {
    // If first page found, render it
    const path = await getDocumentPath(ctx, firstPage)
    const slugPath = path
      .map((doc) => doc.slug)
      .filter((s) => s)
      .join('/')
    return renderPage(ctx, firstPage.id, slugPath || undefined, firstPage, allDocuments)
  }

  // If no page found, show welcome screen
  return renderPage(ctx, null, undefined, undefined, allDocuments)
})

// Страница документа по ID (fallback)
export const documentPageRoute = app.get('/id/:id', async (ctx, req) => {
  const allDocuments = await apiDocumentsListRoute.run(ctx)

  // Check if this looks like a slug path (contains hyphens or multiple segments)
  const id = req.params.id

  // If it doesn't look like a typical ID, try to treat it as slug path
  if (id.includes('-') || id.includes('/')) {
    try {
      const result = await getDocumentBySlug(ctx, id)
      if (result?.document) {
        return renderPage(ctx, result.document.id, id, result.document, allDocuments)
      }
    } catch (e) {
      // Fall through to ID-based lookup
    }
  }

  // Load document by ID
  const Documents = (await import('./tables/documents.table')).default
  const document = await Documents.findById(ctx, id)

  return renderPage(ctx, id, undefined, document, allDocuments)
})

// Catch-all route for slug paths (e.g., /docs/getting-started/installation)
export const slugPathRoute = app.get('/*', async (ctx, req) => {
  const slugPath = req.params['*']
  const allDocuments = await apiDocumentsListRoute.run(ctx)

  try {
    const result = await getDocumentBySlug(ctx, slugPath)
    if (result?.document) {
      return renderPage(ctx, result.document.id, slugPath, result.document, allDocuments)
    }
  } catch (e) {
    console.error('Failed to load by slug path:', e)
  }

  // If slug path not found, render 404 or redirect to home
  return renderPage(ctx, null, undefined, undefined, allDocuments)
})

async function getDocumentBySlug(ctx, slugPath) {
  // Get the slug path from request (everything after /by-slug/)
  if (!slugPath) return null

  // Split slug path into segments
  const slugs = slugPath.split('/').filter((s) => s)
  if (slugs.length === 0) return null

  // Find document by traversing slug path
  const document = await findDocumentBySlugPath(ctx, slugs)
  if (!document) return null

  // Get full path
  const path = await getDocumentPath(ctx, document)

  return {
    document,
    path,
    slugPath: slugPath
  }
}
