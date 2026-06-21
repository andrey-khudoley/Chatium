// @shared-route
import { requireRealUser } from '@app/auth'
import * as focusToolsLib from '../../lib/focus-tools.lib'

export const toolsControlRoute = app.post('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const body = (req.body ?? {}) as { statsDayKey?: string; command?: unknown }
  try {
    const full = await focusToolsLib.executeCommand(ctx, user.id, body, { push: true })
    return { success: true, ...full }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg === 'Task not found') {
      return { success: false, error: 'Задача не найдена' }
    }
    ctx.account.log('tools.control error', {
      level: 'error',
      json: { userId: user.id, error: msg },
    })
    return { success: false, error: 'Не удалось выполнить команду' }
  }
})

export default toolsControlRoute
