// @shared-route
import { parseInstructions } from '../../shared/instructionParser'
import {
  ensureCacheWarm,
  isTruthyQuery,
  listCacheRows,
  MAX_DOCS_TO_CHECK,
  normalizeInstruction,
  normalizeInstructions,
  paginateItems,
  parseLimit,
  syncCacheFromSource,
  toListItem,
} from '../../lib/docs.lib'

// Публичный доступ БЕЗ авторизации: список документов по директиве из первой строки (@instruction).
// ?s=shared — по умолчанию; ?s=chatium — документы с @chatium и т.д.
// Legacy-поддержка: ?instruction=...
export const listSharedDocsRoute = app.get('/', async (ctx, req) => {
  const instruction = normalizeInstruction(
    (req.query.s as string | undefined) || (req.query.instruction as string | undefined)
  )
  const requestedLimit = parseLimit(req.query.limit, MAX_DOCS_TO_CHECK)
  const limit = Math.min(requestedLimit, MAX_DOCS_TO_CHECK)
  const token = req.query.token as string | undefined
  const refresh = isTruthyQuery(req.query.refresh)

  try {
    if (refresh) {
      await syncCacheFromSource(ctx)
    } else {
      await ensureCacheWarm(ctx)
    }

    const rows = await listCacheRows(ctx)
    const filteredItems = rows
      .map(row => ({
        row,
        listItem: toListItem(row)
      }))
      .filter(({ listItem }) => listItem.key.length > 0 && listItem.size > 0 && !listItem.key.endsWith('/'))
      .filter(({ row }) => {
        const parsedFromCache = normalizeInstructions(row.instructions)
        if (parsedFromCache.length > 0) {
          return parsedFromCache.includes(instruction)
        }

        const markdown = typeof row.markdown === 'string' ? row.markdown : ''
        return parseInstructions(markdown).includes(instruction)
      })
      .map(({ listItem }) => listItem)

    return {
      success: true,
      data: paginateItems(filteredItems, limit, token)
    }
  } catch (error) {
    ctx.account.log('Error listing docs by instruction from cache', {
      level: 'error',
      json: { instruction, error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
