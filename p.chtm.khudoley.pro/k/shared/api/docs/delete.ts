// @shared-route
import {
  deleteCacheRowByFilename,
  deleteDocFromSource,
  normalizeFilename,
} from '../../lib/docs.lib'
import { requireAdminIfExternalRequest } from './requireAdmin'

export const deleteDocRoute = app.post('/', async (ctx, req) => {
  requireAdminIfExternalRequest(ctx, req)

  const filename = normalizeFilename(req.body?.filename)

  if (!filename) {
    return { success: false, error: 'Filename parameter is required' }
  }

  try {
    const deleteResult = await deleteDocFromSource(ctx, filename)

    if (!deleteResult.success) {
      return {
        success: false,
        error: deleteResult.error,
        details: deleteResult.details
      }
    }

    let warning = ''

    try {
      await deleteCacheRowByFilename(ctx, filename)
    } catch (cacheError) {
      warning = `Cache cleanup failed: ${String(cacheError)}`
      ctx.account.log('Error deleting doc from cache', {
        level: 'warn',
        json: { filename, error: String(cacheError) }
      })
    }

    ctx.account.log('Doc deleted', {
      level: 'info',
      json: { filename }
    })

    return warning
      ? { success: true, warning }
      : { success: true }
  } catch (error) {
    ctx.account.log('Error deleting doc', {
      level: 'error',
      json: { filename, error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
