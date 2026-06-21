// @shared-route
import {
  ensureCacheWarm,
  isTruthyQuery,
  listCacheRows,
  paginateItems,
  parseLimit,
  syncCacheFromSource,
  toListItem,
} from '../../lib/docs.lib'
import { requireAdminIfExternalRequest } from './requireAdmin'

export const listDocsRoute = app.get('/', async (ctx, req) => {
  requireAdminIfExternalRequest(ctx, req)

  const limit = parseLimit(req.query.limit)
  const token = req.query.token as string | undefined
  const refresh = isTruthyQuery(req.query.refresh)

  try {
    if (refresh) {
      await syncCacheFromSource(ctx)
    } else {
      await ensureCacheWarm(ctx)
    }

    const rows = await listCacheRows(ctx)
    const items = rows
      .map(toListItem)
      .filter(item => item.key.length > 0)

    return {
      success: true,
      data: paginateItems(items, limit, token)
    }
  } catch (error) {
    ctx.account.log('Error listing docs from cache', {
      level: 'error',
      json: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
