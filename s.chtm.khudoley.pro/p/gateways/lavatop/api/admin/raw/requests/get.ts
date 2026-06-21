/**
 * GET /api/admin/raw/requests/get?id=<heapId> — полная запись gatewayRequestLog
 * со всеми полями включая `rawArgs` и `rawHeadersSafe`.
 * Доступ: панель (Admin или активный грант).
 */

import { guardInternalApi } from '../../../../lib/access/apiGuard'

import * as repo from '../../../../repos/gatewayRequestLog.repo'
import * as loggerLib from '../../../../lib/logger.lib'

const LOG_PATH = 'api/admin/raw/requests/get'

export const getGatewayRequestRoute = app.get('/', async (ctx, req) => {
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
      contour: row.contour,
      method: row.method,
      rawArgs: row.rawArgs,
      rawHeadersSafe: row.rawHeadersSafe,
      clientHttpStatus: row.clientHttpStatus,
      errorCode: row.errorCode,
      durationMs: row.durationMs,
      requestedAt: row.requestedAt
    }
  }
})

export default getGatewayRequestRoute
