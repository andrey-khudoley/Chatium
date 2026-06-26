// @shared-route
import { requireAccountRole } from '@app/auth'
import * as diagnosticsRepo from '../../../repos/diagnostics.repo'
import { writeServerLog } from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/diagnostics/get'

/**
 * GET / — полная запись диагностики по id (включая dom).
 */
export const getAdminDiagnosticsGetRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const id = String(req.query?.id ?? '').trim()

  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { id }
  })

  if (!id) {
    await writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] missing id`
    })
    return { success: false, error: 'Параметр id обязателен' }
  }

  const row = await diagnosticsRepo.findById(ctx, id)

  if (!row) {
    await writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] not found`,
      payload: { id }
    })
    return { success: false, error: 'Запись не найдена' }
  }

  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { id, domLen: row.dom?.length }
  })

  return {
    success: true,
    row: {
      id: row.id,
      visitorId: row.visitorId,
      ip: row.ip,
      url: row.url,
      params: row.params,
      dom: row.dom,
      info: row.info,
      createdAt: row.createdAt
    }
  }
})

export default getAdminDiagnosticsGetRoute
