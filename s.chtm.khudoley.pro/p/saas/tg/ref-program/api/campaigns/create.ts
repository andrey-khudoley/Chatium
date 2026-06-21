// @shared-route
import { requireRealUser } from '@app/auth'
import * as campaignRepo from '../../lib/repo/campaignRepo'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/campaigns/create'
const SEV = { error: 3, warn: 4, info: 6, debug: 7 } as const

/**
 * POST /api/campaigns/create — создание кампании.
 * Body: { title: string }
 * Требуется авторизованный пользователь (requireRealUser).
 * Валидация: title — длина не менее 2 символов.
 */
export const createCampaignRoute = app.post('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Запрос POST`,
    payload: { hasBody: !!req.body }
  })
  const user = requireRealUser(ctx)
  const body = (req.body || {}) as { title?: unknown }
  const title = typeof body.title === 'string' ? body.title.trim() : ''

  if (title.length < 2) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Невалидный title`,
      payload: { titleLength: title.length }
    })
    return { success: false, error: 'Поле title обязательно, минимум 2 символа' }
  }

  const campaign = await campaignRepo.createCampaign(ctx, {
    title,
    ownerUserId: user.id
  })
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.info,
    message: `[${LOG_PATH}] Кампания создана`,
    payload: { campaignId: campaign.id, userId: user.id }
  })
  return {
    success: true,
    campaign: {
      id: campaign.id,
      title: campaign.title,
      ownerUserId: campaign.ownerUserId,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt
    }
  }
})
