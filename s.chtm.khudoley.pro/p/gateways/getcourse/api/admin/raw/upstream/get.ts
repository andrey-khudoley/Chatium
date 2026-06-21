/**
 * GET /api/admin/raw/upstream/get?id=<heapId> — полная запись gatewayUpstreamLog
 * со всеми полями включая `rawGcJson`.
 * Доступ: панель (Admin или активный грант).
 */

import { guardInternalApi } from '../../../../lib/access/apiGuard'

import * as repo from '../../../../repos/gatewayUpstreamLog.repo'
import * as loggerLib from '../../../../lib/logger.lib'

const LOG_PATH = 'api/admin/raw/upstream/get'

export const getGatewayUpstreamRoute = app.get('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const q = req.query as Record<string, unknown> | undefined
  const idRaw = q?.id
  const id = typeof idRaw === 'string' ? idRaw.trim() : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { id: id || null }
  })

  if (!id) {
    return { success: false, error: 'Параметр id обязателен' }
  }

  const row = await repo.findById(ctx, id)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { id, found: !!row }
  })

  if (!row) return { success: true, entry: null }

  return {
    success: true,
    entry: {
      id: row.id,
      requestId: row.requestId,
      op: row.op,
      upstreamKind: row.upstreamKind,
      rawGcJson: row.rawGcJson,
      gcHttpStatus: row.gcHttpStatus,
      semanticRule: row.semanticRule,
      durationMs: row.durationMs,
      sentAt: row.sentAt
    }
  }
})

export default getGatewayUpstreamRoute
