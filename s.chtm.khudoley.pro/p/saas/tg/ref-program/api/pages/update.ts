// @shared-route
import { requireRealUser } from '@app/auth'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as pageRepo from '../../lib/repo/pageRepo'

/**
 * POST /api/pages/update — обновление страницы.
 * Body: { pageId: string, title?: string, urlTemplate?: string }
 * Требуется доступ к кампании страницы. Валидация: urlTemplate при наличии должен содержать {ref}.
 */
export const updatePageRoute = app.post('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const body = (req.body || {}) as { pageId?: unknown; title?: unknown; urlTemplate?: unknown }
  const pageId = typeof body.pageId === 'string' ? body.pageId.trim() : ''

  if (!pageId) {
    return { success: false, error: 'Поле pageId обязательно' }
  }

  const page = await pageRepo.getPageById(ctx, pageId)
  if (!page) {
    return { success: false, error: 'Страница не найдена' }
  }

  const campaignId =
    typeof page.campaignId === 'object' && page.campaignId !== null && 'id' in page.campaignId
      ? (page.campaignId as { id: string }).id
      : (page.campaignId as unknown as string)

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  if (!access.hasAccess) {
    return { success: false, error: 'Нет доступа к кампании' }
  }

  const title = typeof body.title === 'string' ? body.title.trim() : undefined
  const urlTemplate = typeof body.urlTemplate === 'string' ? body.urlTemplate.trim() : undefined

  if (title !== undefined && title.length < 1) {
    return { success: false, error: 'Поле title не может быть пустым' }
  }
  if (urlTemplate !== undefined && !urlTemplate.includes('{ref}')) {
    return { success: false, error: 'URL-шаблон должен содержать плейсхолдер {ref}' }
  }

  const updated = await pageRepo.updatePage(ctx, pageId, {
    title,
    urlTemplate
  })
  if (!updated) {
    return { success: false, error: 'Ошибка обновления' }
  }

  return {
    success: true,
    page: {
      id: updated.id,
      campaignId,
      title: updated.title,
      urlTemplate: updated.urlTemplate,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }
  }
})
