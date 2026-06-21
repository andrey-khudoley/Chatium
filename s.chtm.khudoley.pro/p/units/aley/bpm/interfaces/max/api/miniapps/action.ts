// @shared-route
import { acceptMiniappAction, type MiniappActionRequest } from '../../lib/miniappPageEvents.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/miniapps/action'

export const miniappActionRoute = app.post('/', async (ctx, req) => {
  try {
    return await acceptMiniappAction(ctx, (req.body ?? {}) as MiniappActionRequest)
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Miniapp action failed`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
