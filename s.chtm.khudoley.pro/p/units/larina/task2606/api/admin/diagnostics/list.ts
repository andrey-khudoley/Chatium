// @shared-route
import { requireAccountRole } from '@app/auth'
import * as diagnosticsRepo from '../../../repos/diagnostics.repo'
import { writeServerLog } from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/diagnostics/list'

/**
 * GET / — список записей диагностики с пагинацией и фильтрами.
 * Поле dom не включается в список (тяжёлое, доступно через get.ts).
 */
export const getAdminDiagnosticsListRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { query: req.query }
  })

  const limit = Math.max(1, Math.min(parseInt(String(req.query?.limit ?? '')) || 20, 100))
  const offset = Math.max(0, parseInt(String(req.query?.offset ?? '')) || 0)

  const rawVisitorId = String(req.query?.visitorId ?? '').trim()
  const rawIp = String(req.query?.ip ?? '').trim()
  const rawUrl = String(req.query?.url ?? '').trim()

  const filters = {
    visitorId: rawVisitorId || undefined,
    ip: rawIp || undefined,
    url: rawUrl || undefined
  }

  const [rows, total] = await Promise.all([
    diagnosticsRepo.findPage(ctx, { limit, offset, filters }),
    diagnosticsRepo.countPage(ctx, filters)
  ])

  // Возвращаем строки БЕЗ поля dom
  const safeRows = rows.map((r) => ({
    id: r.id,
    visitorId: r.visitorId,
    ip: r.ip,
    url: r.url,
    params: r.params,
    info: r.info,
    createdAt: r.createdAt
  }))

  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { total, rows: safeRows.length, limit, offset }
  })

  return { success: true, rows: safeRows, total, limit, offset }
})

export default getAdminDiagnosticsListRoute
