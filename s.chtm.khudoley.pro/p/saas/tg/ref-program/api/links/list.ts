// @shared-route
import { requireRealUser } from '@app/auth'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as pageRepo from '../../lib/repo/pageRepo'
import * as partnerRepo from '../../lib/repo/partnerRepo'
import * as linkRepo from '../../lib/repo/linkRepo'
import { buildPartnerLinkUrl } from '../../lib/core/urlBuilder'

/**
 * GET /api/links/list?campaignId=… — список партнёрских ссылок кампании (с названиями страниц и партнёров).
 * Требуется авторизация и доступ к кампании.
 */
export const listLinksRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const campaignId = typeof req.query?.campaignId === 'string' ? req.query.campaignId.trim() : ''
  if (!campaignId) {
    return { success: false, error: 'Параметр campaignId обязателен' }
  }

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  if (!access.hasAccess) {
    return { success: false, error: 'Нет доступа к кампании' }
  }

  const [pages, links] = await Promise.all([
    pageRepo.getCampaignPages(ctx, campaignId),
    linkRepo.getCampaignLinks(ctx, campaignId)
  ])

  const pageMap = new Map<string, string>()
  for (const p of pages) {
    if (p.id) pageMap.set(p.id, p.title ?? '')
  }

  const linksWithMeta = await Promise.all(
    links.map(async (link) => {
      const pageId =
        typeof link.pageId === 'object' && link.pageId !== null && 'id' in link.pageId
          ? (link.pageId as { id: string }).id
          : (link.pageId as unknown as string)
      const partnerId =
        typeof link.partnerId === 'object' && link.partnerId !== null && 'id' in link.partnerId
          ? (link.partnerId as { id: string }).id
          : (link.partnerId as unknown as string)
      const partner = partnerId ? await partnerRepo.getPartnerById(ctx, partnerId) : null
      const pageTitle = pageId ? (pageMap.get(pageId) ?? '') : ''
      const partnerName = partner?.fullName?.trim() || partner?.username?.trim() || partnerId || '—'
      const slug = link.publicSlug ?? ''
      return {
        id: link.id,
        campaignId,
        pageId,
        partnerId,
        publicSlug: slug,
        pageTitle,
        partnerName,
        fullUrl: slug ? buildPartnerLinkUrl(slug) : ''
      }
    })
  )

  return {
    success: true,
    links: linksWithMeta
  }
})
