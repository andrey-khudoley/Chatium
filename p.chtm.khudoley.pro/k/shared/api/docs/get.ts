// @shared-route
import { parseInstructions } from '../../shared/instructionParser'
import {
  deleteCacheRowByFilename,
  findCacheRowByFilename,
  getDocFromSource,
  getUtf8Size,
  isTruthyQuery,
  normalizeFilename,
  upsertCacheRow,
} from '../../lib/docs.lib'

export const getDocRoute = app.get('/', async (ctx, req) => {
  // Публичный доступ для краулеров и всех пользователей
  const filename = normalizeFilename(req.query.f || req.query.filename)
  const download = isTruthyQuery(req.query.download)

  if (!filename) {
    return { success: false, error: 'Filename parameter is required' }
  }

  try {
    const cached = await findCacheRowByFilename(ctx, filename)
    if (cached && typeof cached.markdown === 'string') {
      return { success: true, data: cached.markdown }
    }

    const sourceDoc = await getDocFromSource(ctx, filename, download)

    if (sourceDoc.kind === 'not-found') {
      await deleteCacheRowByFilename(ctx, filename)
      return { success: false, error: 'NotFound' }
    }

    if (sourceDoc.kind === 'error') {
      return { success: false, error: sourceDoc.error || 'Unknown source error' }
    }

    const markdown = sourceDoc.markdown || ''
    await upsertCacheRow(ctx, {
      key: filename,
      markdown,
      size: getUtf8Size(markdown),
      lastModified: new Date().toISOString(),
      instructions: parseInstructions(markdown)
    })

    return { success: true, data: markdown }
  } catch (error) {
    ctx.account.log('Error getting doc', {
      level: 'error',
      json: { filename, error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
