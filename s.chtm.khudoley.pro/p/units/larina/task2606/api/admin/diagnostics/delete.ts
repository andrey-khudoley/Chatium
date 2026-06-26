// @shared-route
import { requireAccountRole } from '@app/auth'
import * as diagnosticsRepo from '../../../repos/diagnostics.repo'
import { writeServerLog } from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/diagnostics/delete'

/**
 * POST / — удаление записи диагностики по id. Только для роли Admin.
 * Body: { id: string }.
 */
export const postAdminDiagnosticsDeleteRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const body = (req.body ?? {}) as { id?: unknown }
  const id = String(body.id ?? '').trim()

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

  const removed = await diagnosticsRepo.remove(ctx, id)

  if (!removed) {
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
    payload: { id }
  })

  return { success: true, id }
})

export default postAdminDiagnosticsDeleteRoute
