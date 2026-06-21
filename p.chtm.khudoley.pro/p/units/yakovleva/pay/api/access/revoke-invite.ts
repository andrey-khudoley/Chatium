// @shared-route
/**
 * POST /api/access/revoke-invite — отозвать неиспользованный инвайт
 * (implementation-plan §1.11.5). Admin-only.
 *
 * Body: { inviteId: string }
 */

import { requireRealUser, requireAccountRole } from '@app/auth'
import { revokeInvite } from '../../lib/access/invites'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/access/revoke-invite'

export const revokeInviteRoute = app.post('/', async (ctx, req) => {
  requireRealUser(ctx)
  requireAccountRole(ctx, 'Admin')

  const body = req.body as { inviteId?: unknown } | undefined
  const inviteId = typeof body?.inviteId === 'string' ? body.inviteId.trim() : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { inviteId }
  })

  if (!inviteId) {
    return { success: false, error: 'Поле inviteId обязательно' }
  }

  try {
    await revokeInvite(ctx, inviteId)
    return { success: true }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] error`,
      payload: { inviteId, error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})

export default revokeInviteRoute
