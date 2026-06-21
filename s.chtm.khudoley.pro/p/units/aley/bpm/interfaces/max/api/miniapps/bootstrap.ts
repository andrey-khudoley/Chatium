// @shared-route
import { bootstrapMiniappPage, type MiniappBootstrapRequest } from '../../lib/miniappPageEvents.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/miniapps/bootstrap'

export const miniappBootstrapRoute = app.post('/', async (ctx, req) => {
  try {
    return await bootstrapMiniappPage(ctx, (req.body ?? {}) as MiniappBootstrapRequest)
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Miniapp bootstrap failed`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
