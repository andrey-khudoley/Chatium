// @shared-route
/**
 * GET /api/access/invites — список пригласительных ссылок (implementation-plan §1.11.5).
 * Admin-only. Поле `token` НЕ возвращается (показан один раз при генерации).
 */

import { requireRealUser, requireAccountRole, findUsersByIds } from '@app/auth'
import * as panelInvitesRepo from '../../repos/panelInvites.repo'
import { classifyInvite, type InviteState } from '../../lib/access/invites'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/access/invites'

/** Состояние инвайта для UI: valid → active. */
function inviteStatus(state: InviteState): 'active' | 'used' | 'revoked' | 'expired' {
  return state === 'valid' ? 'active' : (state as 'used' | 'revoked' | 'expired')
}

export const listInvitesRoute = app.get('/', async (ctx) => {
  requireRealUser(ctx)
  requireAccountRole(ctx, 'Admin')

  const rows = await panelInvitesRepo.findAll(ctx)
  const now = Date.now()

  const userIds = Array.from(
    new Set(
      rows.flatMap((r) => [r.createdByUserId, r.usedByUserId].filter((v): v is string => !!v))
    )
  )
  const users = userIds.length > 0 ? await findUsersByIds(ctx, userIds) : []
  const nameById = new Map(users.map((u) => [u.id, u.displayName]))

  const invites = rows.map((r) => ({
    inviteId: r.id,
    note: r.note ?? '',
    createdByDisplayName: nameById.get(r.createdByUserId) ?? r.createdByUserId,
    issuedAt: r.issuedAt,
    expiresAt: r.expiresAt,
    usedAt: r.usedAt ?? null,
    usedByDisplayName: r.usedByUserId ? (nameById.get(r.usedByUserId) ?? r.usedByUserId) : null,
    revokedAt: r.revokedAt ?? null,
    status: inviteStatus(classifyInvite(r, now))
  }))

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { count: invites.length }
  })

  return { success: true, invites }
})

export default listInvitesRoute
