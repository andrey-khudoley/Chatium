// @shared-route
import { requireAccountRole } from '@app/auth'
import {
  getLogLevel,
  setLogLevel,
  VALID_LEVELS,
  type BrokerLogLevelSetting
} from '../../../lib/log/settings'
import { writeServerLog } from '../../../lib/log/logger'

/**
 * Admin-only переключатель уровня логирования (§5.11 п.2, §5.10.4/§3.6) —
 * сценарий «поднять до Debug при инциденте». level не задан → только чтение
 * текущего значения. Невалидный level — отклоняется без исключения (как
 * прочая структурная валидация брокера, lib/broker/register.ts). Успешная
 * смена — читается заново ПОСЛЕ записи (setLogLevel инвалидирует кэш сразу).
 */
export const brokerAdminLogLevelRoute = app
  .post('/')
  .body((s) => ({
    level: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    if (req.body.level !== undefined) {
      if (!(VALID_LEVELS as readonly string[]).includes(req.body.level)) {
        return {
          success: false,
          error: `broker: недопустимый log_level "${req.body.level}", ожидается один из: ${VALID_LEVELS.join(', ')}`
        }
      }
      const level = req.body.level as BrokerLogLevelSetting
      await setLogLevel(ctx, level)
      await writeServerLog(ctx, {
        level: 'info',
        message: `broker: log_level изменён на "${level}" через admin-панель`,
        marks: { level }
      })
    }

    const level = await getLogLevel(ctx)
    return { success: true, level }
  })
