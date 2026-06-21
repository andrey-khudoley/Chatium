// @shared-route
/**
 * POST /api/access/revoke-grant — отозвать выданный доступ пользователя. Admin-only.
 *
 * Body: { userId: string }
 * Защита от селф-отзыва Admin'ом не нужна: Admin проходит ветку
 * `ctx.user.is('Admin')` в requireInternalAccess без записи в panel_access.
 */

import { requireRealUser, requireAccountRole } from '@app/auth'
import { revokeGrant } from '../../lib/access/invites'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/access/revoke-grant'

export const revokeGrantRoute = app.post('/', async (ctx, req) => {
  requireRealUser(ctx)
  requireAccountRole(ctx, 'Admin')

  const body = req.body as { userId?: unknown } | undefined
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { userId }
  })

  if (!userId) {
    return { success: false, error: 'Поле userId обязательно' }
  }

  try {
    const revoked = await revokeGrant(ctx, userId)
    return { success: true, revoked }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] error`,
      payload: { userId, error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})

export default revokeGrantRoute
