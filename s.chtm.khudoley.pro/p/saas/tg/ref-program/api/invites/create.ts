// @shared-route
import { requireRealUser } from '@app/auth'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as inviteRepo from '../../lib/repo/inviteRepo'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/invites/create'
const SEV = { error: 3, warn: 4, info: 6, debug: 7 } as const

/**
 * POST /api/invites/create — создание приглашения в кампанию.
 * Body: { campaignId: string, expiresInDays?: number }
 * Требуется доступ к кампании. Возвращает invite с token и ссылкой.
 */
export const createInviteRoute = app.post('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Запрос POST`,
    payload: { hasBody: !!req.body }
  })
  const user = requireRealUser(ctx)
  const body = (req.body || {}) as { campaignId?: unknown; expiresInDays?: unknown }
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : ''
  if (!campaignId) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] campaignId не указан`,
      payload: {}
    })
    return { success: false, error: 'Поле campaignId обязательно' }
  }

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  if (!access.hasAccess) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Нет доступа к кампании`,
      payload: { campaignId, userId: user.id }
    })
    return { success: false, error: 'Нет доступа к кампании' }
  }

  const expiresInDays =
    typeof body.expiresInDays === 'number' && body.expiresInDays > 0
      ? body.expiresInDays
      : undefined

  const invite = await inviteRepo.createInvite(ctx, {
    campaignId,
    createdByUserId: user.id,
    expiresInDays
  })
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.info,
    message: `[${LOG_PATH}] Инвайт создан`,
    payload: { campaignId, inviteId: invite.id }
  })
  const token = invite.token || ''
  return {
    success: true,
    invite: {
      id: invite.id,
      token,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt
    }
  }
})
