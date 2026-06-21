// @shared-route
import { requireRealUser } from '@app/auth'
import * as campaignRepo from '../../lib/repo/campaignRepo'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/campaigns/list'
const SEV = { debug: 7, info: 6 } as const

/**
 * GET /api/campaigns/list — список кампаний текущего пользователя.
 * Требуется авторизованный пользователь (requireRealUser).
 */
export const listCampaignsRoute = app.get('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Запрос GET`,
    payload: {}
  })
  const user = requireRealUser(ctx)
  const campaigns = await campaignRepo.getUserCampaigns(ctx, user.id)
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.info,
    message: `[${LOG_PATH}] Список кампаний получен`,
    payload: { userId: user.id, count: campaigns.length }
  })
  return {
    success: true,
    campaigns: campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }))
  }
})
