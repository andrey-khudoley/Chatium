// @shared-route
import { requireRealUser } from '@app/auth'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as partnerRepo from '../../lib/repo/partnerRepo'
import * as linkRepo from '../../lib/repo/linkRepo'
import type { PartnerStats } from '../../shared/types'
import { buildPartnerLinkUrl } from '../../lib/core/urlBuilder'
import * as pageRepo from '../../lib/repo/pageRepo'

/**
 * GET /api/partners/get?campaignId=…&partnerId=… — партнёр по id и его ссылки, сводка по рефералам.
 * Требуется авторизация и доступ к кампании.
 */
export const getPartnerRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const campaignId = typeof req.query?.campaignId === 'string' ? req.query.campaignId.trim() : ''
  const partnerId = typeof req.query?.partnerId === 'string' ? req.query.partnerId.trim() : ''
  if (!campaignId || !partnerId) {
    return { success: false, error: 'Параметры campaignId и partnerId обязательны' }
  }

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  if (!access.hasAccess) {
    return { success: false, error: 'Нет доступа к кампании' }
  }

  const partner = await partnerRepo.getPartnerById(ctx, partnerId)
  const partnerCampaignId =
    typeof partner?.campaignId === 'object' &&
    partner?.campaignId !== null &&
    'id' in partner.campaignId
      ? (partner.campaignId as { id: string }).id
      : (partner?.campaignId as unknown as string | undefined)
  if (!partner || partnerCampaignId !== campaignId) {
    return { success: false, error: 'Партнёр не найден' }
  }

  const links = await linkRepo.getPartnerLinks(ctx, partnerId)
  const pages = await pageRepo.getCampaignPages(ctx, campaignId)
  const pageMap = new Map<string, string>()
  for (const p of pages) {
    if (p.id) pageMap.set(p.id, (p as { title?: string }).title ?? '')
  }

  const linksWithMeta = links.map((link) => {
    const pageId =
      typeof link.pageId === 'object' && link.pageId !== null && 'id' in link.pageId
        ? (link.pageId as { id: string }).id
        : (link.pageId as unknown as string)
    const slug = link.publicSlug ?? ''
    return {
      id: link.id,
      pageId,
      pageTitle: pageId ? (pageMap.get(pageId) ?? '') : '',
      publicSlug: slug,
      fullUrl: slug ? buildPartnerLinkUrl(slug) : ''
    }
  })

  const stats = (partner.stats as PartnerStats | null) ?? {
    registrations: 0,
    orders: 0,
    payments: 0,
    paymentsSum: 0,
    earnings: 0,
    pendingEarnings: 0
  }

  return {
    success: true,
    partner: {
      id: partner.id,
      tgId: partner.tgId,
      username: partner.username,
      fullName: partner.fullName,
      stats
    },
    links: linksWithMeta
  }
})
