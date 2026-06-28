// @shared-route
import { requireAccountRole } from '@app/auth'
import * as segmentsRepo from '../../../repos/segments.repo'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/segments/list'

/**
 * GET /api/admin/segments/list — список всех сегментов (включая disabled).
 * Только Admin.
 */
export const adminListSegmentsRoute = app.get('/', async (ctx, _req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос списка сегментов`,
    payload: {}
  })

  try {
    const segments = await segmentsRepo.findAll(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Список сегментов получен`,
      payload: { count: segments.length }
    })

    return { success: true, segments }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка получения сегментов`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
