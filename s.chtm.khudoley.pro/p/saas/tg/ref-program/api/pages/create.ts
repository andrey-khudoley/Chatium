// @shared-route
import { requireRealUser } from '@app/auth'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as pageRepo from '../../lib/repo/pageRepo'

/**
 * POST /api/pages/create — создание целевой страницы кампании.
 * Body: { campaignId: string, title: string, urlTemplate: string }
 * Требуется доступ к кампании. Валидация: urlTemplate должен содержать {ref}.
 */
export const createPageRoute = app.post('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const body = (req.body || {}) as { campaignId?: unknown; title?: unknown; urlTemplate?: unknown }
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const urlTemplate = typeof body.urlTemplate === 'string' ? body.urlTemplate.trim() : ''

  if (!campaignId) {
    return { success: false, error: 'Поле campaignId обязательно' }
  }

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  if (!access.hasAccess) {
    return { success: false, error: 'Нет доступа к кампании' }
  }

  if (title.length < 1) {
    return { success: false, error: 'Поле title обязательно' }
  }
  if (!urlTemplate.includes('{ref}')) {
    return { success: false, error: 'URL-шаблон должен содержать плейсхолдер {ref}' }
  }

  const page = await pageRepo.createPage(ctx, {
    campaignId,
    title,
    urlTemplate
  })

  return {
    success: true,
    page: {
      id: page.id,
      campaignId,
      title: page.title,
      urlTemplate: page.urlTemplate,
      webhookSecret: page.webhookSecret ?? undefined,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt
    }
  }
})
