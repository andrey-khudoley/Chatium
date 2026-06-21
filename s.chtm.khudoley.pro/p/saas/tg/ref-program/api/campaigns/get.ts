// @shared-route
import { requireRealUser } from '@app/auth'
import * as campaignRepo from '../../lib/repo/campaignRepo'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/campaigns/get'
const SEV = { error: 3, warn: 4, info: 6, debug: 7 } as const

/**
 * GET /api/campaigns/get?campaignId=… — кампания по id.
 * Требуется авторизация и доступ к кампании (участник).
 */
export const getCampaignRoute = app.get('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Запрос GET`,
    payload: { query: req.query }
  })
  const user = requireRealUser(ctx)
  const campaignId = typeof req.query?.campaignId === 'string' ? req.query.campaignId.trim() : ''
  if (!campaignId) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] campaignId не указан`,
      payload: {}
    })
    return { success: false, error: 'Параметр campaignId обязателен' }
  }

  const campaign = await campaignRepo.getCampaignById(ctx, campaignId)
  if (!campaign) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Кампания не найдена`,
      payload: { campaignId }
    })
    return { success: false, error: 'Кампания не найдена' }
  }
  if (campaign.isDeleted === true) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Кампания удалена`,
      payload: { campaignId }
    })
    return { success: false, error: 'Кампания удалена' }
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

  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Кампания возвращена`,
    payload: { campaignId }
  })
  return {
    success: true,
    campaign: {
      id: campaign.id,
      title: campaign.title,
      ownerUserId: campaign.ownerUserId,
      settings: campaign.settings,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt
    }
  }
})
