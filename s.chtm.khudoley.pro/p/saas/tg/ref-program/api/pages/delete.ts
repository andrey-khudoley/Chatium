// @shared-route
import { requireRealUser } from '@app/auth'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as pageRepo from '../../lib/repo/pageRepo'

/**
 * POST /api/pages/delete — удаление страницы.
 * Body: { pageId: string }
 * Требуется доступ к кампании страницы.
 */
export const deletePageRoute = app.post('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const body = (req.body || {}) as { pageId?: unknown }
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

  const ok = await pageRepo.deletePage(ctx, pageId)
  if (!ok) {
    return { success: false, error: 'Ошибка удаления' }
  }
  return { success: true }
})
