// @shared
import { getBasePath } from './index'
import { findDocumentBySlugPath, apiDocumentsListRoute } from './api/documents'
import { renderPage } from './index'
import Documents from './tables/documents.table'

/**
 * Find document by single slug (slug-only URL type)
 */
async function findDocumentBySlug(ctx: app.Ctx, slug: string) {
  const document = await Documents.findOneBy(ctx, { slug })
  return document
}

app.accountHook('404', async (ctx, req) => {
  const basePath = await getBasePath(ctx)

  if (req.path.startsWith(basePath + '/')) {
    // Remove base path from the URL
    const pathAfterBase = req.path.substring(basePath.length + 1) // +1 to remove leading slash

    if (pathAfterBase) {
      // Check if this is an ID-based URL (/doc/id/{documentId})
      if (pathAfterBase.startsWith('id/')) {
        const documentId = pathAfterBase.substring(3) // Remove 'id/' prefix

        if (documentId) {
          try {
            // Load document by ID
            const document = await Documents.findById(ctx, documentId)

            if (document) {
              // Load all documents for navigation
              const allDocuments = await apiDocumentsListRoute.run(ctx)

              // Render the page
              const docPage = await renderPage(ctx, document.id, undefined, document, allDocuments)
              return ctx.resp.html(docPage)
            }
          } catch (e) {
            console.error('Error in 404 hook (ID-based):', e)
          }
        }
      } else if (pathAfterBase.includes('/')) {
        // Handle as slug path (contains slashes)
        const slugPath = pathAfterBase
        const slugs = slugPath.split('/').filter((s) => s)

        if (slugs.length > 0) {
          try {
            // Find document by slug path
            const document = await findDocumentBySlugPath(ctx, slugs)

            if (document) {
              // Load all documents for navigation
              const allDocuments = await apiDocumentsListRoute.run(ctx)

              // Render the page
              const docPage = await renderPage(ctx, document.id, slugPath, document, allDocuments)
              return ctx.resp.html(docPage)
            }
          } catch (e) {
            console.error('Error in 404 hook (slug-path):', e)
          }
        }
      } else {
        // Handle as single slug (slug-only URL type)
        const slug = pathAfterBase

        try {
          // Find document by slug only
          const document = await findDocumentBySlug(ctx, slug)

          if (document) {
            // Load all documents for navigation
            const allDocuments = await apiDocumentsListRoute.run(ctx)

            // Render the page
            const docPage = await renderPage(ctx, document.id, slug, document, allDocuments)
            return ctx.resp.html(docPage)
          }
        } catch (e) {
          console.error('Error in 404 hook (slug-only):', e)
        }
      }

      return ctx.resp.redirect(basePath)
    }
  }
})
