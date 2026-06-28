// @shared-route
import { requireAccountRole } from '@app/auth'
import * as spinsRepo from '../../../repos/spins.repo'
import * as spinGrantsRepo from '../../../repos/spinGrants.repo'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/wheel/reset'

/**
 * POST /api/admin/wheel/reset — сброс всех попыток и результатов колеса.
 * Только Admin. Вызывается из AdminWheelSettings Vue.
 * Ответ: { success:true, deletedSpins:number, deletedGrants:number }
 * Порядок удаления: сначала Spins (зависимые записи), затем SpinGrants.
 * Частичный сбой — принятый риск (повторный вызов идемпотентен, §11.8).
 */
export const resetWheelRoute = app.post('/', async (ctx, _req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос сброса колеса`,
    payload: {}
  })

  try {
    const deletedSpins = await spinsRepo.deleteAll(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Удалены записи вращений`,
      payload: { deletedSpins }
    })

    const deletedGrants = await spinGrantsRepo.deleteAll(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Удалены дополнительные попытки`,
      payload: { deletedGrants }
    })

    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Колесо сброшено`,
      payload: { deletedSpins, deletedGrants }
    })

    return { success: true, deletedSpins, deletedGrants }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка сброса колеса`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
