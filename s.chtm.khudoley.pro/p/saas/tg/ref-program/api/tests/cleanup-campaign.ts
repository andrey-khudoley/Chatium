// @shared-route
import { requireAnyUser } from '@app/auth'
import Campaigns from '../../tables/campaigns.table'
import CampaignMembers from '../../tables/campaign_members.table'

/**
 * POST /api/tests/cleanup-campaign — удаление тестовой кампании (для очистки после теста campaigns-create).
 * Body: { campaignId: string }
 * Удаляет кампанию и всех участников только если кампания принадлежит текущему пользователю.
 */
export const cleanupCampaignRoute = app.post('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const userId = ctx.user?.id
  if (typeof userId !== 'string') {
    return { success: false, error: 'Нет пользователя в контексте' }
  }

  const body = (req.body || {}) as { campaignId?: unknown }
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : ''
  if (!campaignId) {
    return { success: false, error: 'campaignId обязателен' }
  }

  const campaign = await Campaigns.findById(ctx, campaignId)
  if (!campaign) {
    return { success: true, deleted: false, message: 'Кампания не найдена' }
  }

  const ownerId = campaign.ownerUserId?.id ?? campaign.ownerUserId
  if (ownerId !== userId) {
    return { success: false, error: 'Нет прав на удаление этой кампании' }
  }

  const members = await CampaignMembers.findAll(ctx, {
    where: { campaignId },
    limit: 100
  })
  for (const m of members) {
    try {
      await CampaignMembers.delete(ctx, m.id)
    } catch (_) {}
  }
  try {
    await Campaigns.delete(ctx, campaignId)
  } catch (e) {
    return { success: false, error: (e as Error)?.message ?? String(e) }
  }

  return { success: true, deleted: true }
})
