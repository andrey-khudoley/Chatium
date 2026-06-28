// @shared-route
import { requireAccountRole } from '@app/auth'
import * as segmentsRepo from '../../../repos/segments.repo'
import * as spinsRepo from '../../../repos/spins.repo'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/segments/delete'

/**
 * POST /api/admin/segments/delete — удаление сегмента по id.
 * Body: { id: string }
 * Только Admin.
 */
export const adminDeleteSegmentRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос удаления сегмента`,
    payload: { bodyKeys: req.body ? Object.keys(req.body as object) : [] }
  })

  const body = req.body as { id?: unknown }
  const id = typeof body?.id === 'string' ? body.id.trim() : ''

  if (!id) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Валидация: id обязателен`,
      payload: {}
    })
    return { success: false, error: 'Поле id обязательно' }
  }

  try {
    // Guard §11.4/§8.3: нельзя удалять сегмент с историей побед
    const wins = await spinsRepo.countBySegment(ctx, id)
    if (wins > 0) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Отказ удаления: сегмент имеет историю побед`,
        payload: { id, wins }
      })
      return {
        success: false,
        error: 'Нельзя удалить сегмент с историей побед. Отключите его или сбросьте результаты.'
      }
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Удаление сегмента`,
      payload: { id }
    })

    await segmentsRepo.deleteById(ctx, id)

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Сегмент удалён`,
      payload: { id }
    })

    return { success: true }
  } catch (error) {
    const msg = String(error)
    // Гонка countBySegment→delete: между проверкой и удалением мог появиться spin (§8.3).
    // Heap бросает "dependent links" — подменяем сырой техтекст дружелюбным сообщением.
    const isDependentLinks = /dependent links|data consistency/i.test(msg)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка удаления сегмента`,
      payload: { id, error: msg, dependentLinks: isDependentLinks }
    })
    return {
      success: false,
      error: isDependentLinks
        ? 'Нельзя удалить сегмент с историей побед. Отключите его или сбросьте результаты.'
        : msg
    }
  }
})
