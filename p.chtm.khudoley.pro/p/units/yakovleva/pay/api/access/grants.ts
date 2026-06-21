// @shared-route
/**
 * GET /api/access/grants — список выданных доступов (implementation-plan §1.11.5).
 * Admin-only. Возвращает активные и отозванные гранты.
 */

import { requireRealUser, requireAccountRole, findUsersByIds } from '@app/auth'
import * as panelAccessRepo from '../../repos/panelAccess.repo'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/access/grants'

export const listGrantsRoute = app.get('/', async (ctx) => {
  requireRealUser(ctx)
  requireAccountRole(ctx, 'Admin')

  const rows = await panelAccessRepo.findAll(ctx)

  const userIds = Array.from(
    new Set(
      rows
        .flatMap((r) => [r.userId, r.grantedByUserId, r.revokedByUserId])
        .filter((v): v is string => !!v)
    )
  )
  const users = userIds.length > 0 ? await findUsersByIds(ctx, userIds) : []
  const nameById = new Map(users.map((u) => [u.id, u.displayName]))
  const emailById = new Map(users.map((u) => [u.id, u.confirmedEmail ?? '']))

  const grants = rows.map((r) => ({
    userId: r.userId,
    userDisplayName: nameById.get(r.userId) ?? r.userId,
    userEmail: emailById.get(r.userId) ?? '',
    grantedAt: r.grantedAt,
    grantedByDisplayName: nameById.get(r.grantedByUserId) ?? r.grantedByUserId,
    inviteId: r.inviteId,
    revokedAt: r.revokedAt ?? null,
    revokedByDisplayName: r.revokedByUserId
      ? (nameById.get(r.revokedByUserId) ?? r.revokedByUserId)
      : null,
    active: !r.revokedAt
  }))

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { count: grants.length }
  })

  return { success: true, grants }
})

export default listGrantsRoute
