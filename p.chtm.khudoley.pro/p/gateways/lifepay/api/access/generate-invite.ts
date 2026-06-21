// @shared-route
/**
 * POST /api/access/generate-invite — создать пригласительную ссылку. Admin-only.
 *
 * Body: { note?: string }
 * Ответ: { success: true, inviteId, token, fullUrl, expiresAt }.
 * Токен возвращается ЕДИНСТВЕННЫЙ раз (в списке инвайтов он не показывается).
 */

import { requireRealUser, requireAccountRole } from '@app/auth'
import { generateInvite } from '../../lib/access/invites'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/access/generate-invite'

export const generateInviteRoute = app.post('/', async (ctx, req) => {
  requireRealUser(ctx)
  requireAccountRole(ctx, 'Admin')

  const body = req.body as { note?: unknown } | undefined
  const note = typeof body?.note === 'string' ? body.note.trim() : undefined

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { hasNote: !!note }
  })

  try {
    const invite = await generateInvite(ctx, note ? { note } : undefined)
    return {
      success: true,
      inviteId: invite.inviteId,
      token: invite.token,
      fullUrl: invite.fullUrl,
      expiresAt: invite.expiresAt
    }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] error`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})

export default generateInviteRoute
