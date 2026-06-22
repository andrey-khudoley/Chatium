// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'
import { registerCoreBrokerSubscription } from '../../lib/broker/coreBrokerClient.lib'

const LOG_MODULE = 'api/module/register'

export const moduleRegisterRoute = app.post('/', async (ctx, _req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] вход — регистрация broker module/subscription`,
    payload: {}
  })

  try {
    const result = await registerCoreBrokerSubscription(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] регистрация выполнена`,
      payload: { success: result.success }
    })
    return { success: result.success, result }
  } catch (e) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] ошибка регистрации`,
      payload: { error: e instanceof Error ? e.message : String(e) }
    })
    return { success: false, result: { error: e instanceof Error ? e.message : String(e) } }
  }
})

export default moduleRegisterRoute
