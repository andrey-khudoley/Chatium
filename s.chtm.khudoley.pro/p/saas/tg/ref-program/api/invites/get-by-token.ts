// @shared-route
import * as inviteRepo from '../../lib/repo/inviteRepo'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/invites/get-by-token'
const SEV = { error: 3, warn: 4, info: 6, debug: 7 } as const

/**
 * GET /api/invites/get-by-token?token=… — информация о приглашении по токену (название кампании).
 * Публичный эндпоинт (для страницы приглашения до входа).
 */
export const getInviteByTokenRoute = app.get('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Запрос GET`,
    payload: { hasToken: !!req.query?.token }
  })
  const token = typeof req.query?.token === 'string' ? req.query.token.trim() : ''
  if (!token) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] token не указан`,
      payload: {}
    })
    return { success: false, error: 'Параметр token обязателен' }
  }

  const data = await inviteRepo.getInviteByToken(ctx, token)
  if (!data) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.info,
      message: `[${LOG_PATH}] Приглашение не найдено или недействительно`,
      payload: { tokenPrefix: token.slice(0, 8) + '…' }
    })
    return { success: false, error: 'Приглашение не найдено, истекло или уже использовано' }
  }
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Инвайт найден`,
    payload: { campaignId: data.campaign.id }
  })
  return {
    success: true,
    campaignTitle: data.campaign.title,
    campaignId: data.campaign.id,
    expiresAt: data.invite.expiresAt
  }
})
