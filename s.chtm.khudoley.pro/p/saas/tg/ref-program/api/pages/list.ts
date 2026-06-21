// @shared-route
import { requireRealUser } from '@app/auth'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as pageRepo from '../../lib/repo/pageRepo'

/**
 * GET /api/pages/list?campaignId=… — список страниц кампании.
 * Требуется авторизация и доступ к кампании.
 */
export const listPagesRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const campaignId = typeof req.query?.campaignId === 'string' ? req.query.campaignId.trim() : ''
  if (!campaignId) {
    return { success: false, error: 'Параметр campaignId обязателен' }
  }

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  if (!access.hasAccess) {
    return { success: false, error: 'Нет доступа к кампании' }
  }

  const pages = await pageRepo.getCampaignPages(ctx, campaignId)
  return {
    success: true,
    pages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      urlTemplate: p.urlTemplate,
      webhookSecret: p.webhookSecret,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }))
  }
})
