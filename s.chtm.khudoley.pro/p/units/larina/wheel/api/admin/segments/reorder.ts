// @shared-route
import { requireAccountRole } from '@app/auth'
import * as segmentsRepo from '../../../repos/segments.repo'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/segments/reorder'

/**
 * POST /api/admin/segments/reorder — задать порядок сегментов.
 * Body: { ids: string[] } — полный упорядоченный массив id всех сегментов.
 * Сервер присваивает order = index по позиции в массиве.
 * Только Admin.
 */
export const adminReorderSegmentsRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос переупорядочивания сегментов`,
    payload: { bodyKeys: req.body ? Object.keys(req.body as object) : [] }
  })

  const body = req.body as { ids?: unknown }
  const ids = Array.isArray(body?.ids) ? (body.ids as unknown[]) : null

  if (!ids || ids.length === 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Валидация: ids должен быть непустым массивом`,
      payload: { ids }
    })
    return { success: false, error: 'Поле ids должно быть непустым массивом' }
  }

  const stringIds = ids.map((id) => String(id))

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Обновление порядка сегментов`,
    payload: { count: stringIds.length }
  })

  try {
    for (let index = 0; index < stringIds.length; index++) {
      const id = stringIds[index]!
      await segmentsRepo.updateOrder(ctx, id, index)
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Порядок сегментов обновлён`,
      payload: { count: stringIds.length }
    })

    return { success: true }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка переупорядочивания сегментов`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
