// @shared-route
import { requireRealUser } from '@app/auth'
import { genSocketId } from '@app/socket'
import * as focusToolsLib from '../../lib/focus-tools.lib'
import { focusToolsSocketId } from '../../shared/focus-tools-types'

export const toolsStateRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  try {
    // Дневной ключ статистики на сервере: Heap timezone + Date.now() (см. focus-tools.lib expectedDayKey).
    // Query statsDayKey не обязателен и не меняет логику — оставлен для совместимости клиентов.
    const full = await focusToolsLib.getFullState(ctx, user.id)
    const encodedSocketId = await genSocketId(ctx, focusToolsSocketId(user.id))
    return { success: true, ...full, encodedSocketId }
  } catch (error) {
    ctx.account.log('tools.state error', {
      level: 'error',
      json: { userId: user.id, error: String(error) },
    })
    return { success: false, error: 'Не удалось получить состояние инструментов' }
  }
})

export default toolsStateRoute
