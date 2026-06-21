// @shared-route
import { requireRealUser } from '@app/auth'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as partnerRepo from '../../lib/repo/partnerRepo'

/**
 * GET /api/partners/list?campaignId=…&limit=…&offset=…&sortBy=…&order=… — список партнёров кампании.
 * Требуется авторизация и доступ к кампании.
 */
export const listPartnersRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const campaignId = typeof req.query?.campaignId === 'string' ? req.query.campaignId.trim() : ''
  if (!campaignId) {
    return { success: false, error: 'Параметр campaignId обязателен' }
  }

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  if (!access.hasAccess) {
    return { success: false, error: 'Нет доступа к кампании' }
  }

  const limit = typeof req.query?.limit === 'string' ? parseInt(req.query.limit, 10) : 20
  const offset = typeof req.query?.offset === 'string' ? parseInt(req.query.offset, 10) : 0
  const sortBy = (req.query?.sortBy === 'fullName' ? 'fullName' : 'id') as 'fullName' | 'id'
  const order = (req.query?.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

  const { partners, total } = await partnerRepo.listPartners(ctx, campaignId, {
    limit: Number.isNaN(limit) ? 20 : Math.min(limit, 100),
    offset: Number.isNaN(offset) ? 0 : Math.max(0, offset),
    sortBy,
    order
  })

  return {
    success: true,
    partners: partners.map((p) => ({
      id: p.id,
      tgId: p.tgId,
      username: p.username,
      fullName: p.fullName,
      stats: p.stats
    })),
    total
  }
})
