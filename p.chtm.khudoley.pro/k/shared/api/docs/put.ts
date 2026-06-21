// @shared-route
import {
  getUtf8Size,
  normalizeFilename,
  putDocToSource,
  refreshSingleDocCache,
} from '../../lib/docs.lib'
import { requireAdminIfExternalRequest } from './requireAdmin'

export const putDocRoute = app.post('/', async (ctx, req) => {
  requireAdminIfExternalRequest(ctx, req)

  const filename = normalizeFilename(req.body?.filename)
  const markdown = typeof req.body?.markdown === 'string' ? req.body.markdown : undefined

  if (!filename || markdown === undefined) {
    return { success: false, error: 'Filename and markdown are required' }
  }

  try {
    const putResult = await putDocToSource(ctx, filename, markdown)

    if (!putResult.success) {
      return {
        success: false,
        error: putResult.error,
        details: putResult.details
      }
    }

    const cacheResult = await refreshSingleDocCache(ctx, filename, {
      fallbackMarkdown: markdown,
      fallbackEtag: putResult.etag,
      fallbackSize: getUtf8Size(markdown)
    })

    if (!cacheResult.success) {
      return {
        success: false,
        error: cacheResult.error || 'Document was uploaded, but cache sync failed'
      }
    }

    if (cacheResult.warning) {
      ctx.account.log('Doc cache synced with fallback data', {
        level: 'warn',
        json: { filename, warning: cacheResult.warning }
      })
    }

    return { success: true, etag: putResult.etag || '' }
  } catch (error) {
    ctx.account.log('Error putting doc', {
      level: 'error',
      json: { filename, error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
