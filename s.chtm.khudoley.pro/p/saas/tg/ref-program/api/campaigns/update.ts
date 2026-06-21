// @shared-route
import { requireRealUser } from '@app/auth'
import * as campaignRepo from '../../lib/repo/campaignRepo'
import * as memberRepo from '../../lib/repo/memberRepo'
import type { CampaignSettings } from '../../shared/types'

/**
 * POST /api/campaigns/update — обновление настроек кампании.
 * Body: { campaignId: string, settings: Partial<CampaignSettings> }
 * Требуется доступ к кампании (участник).
 */
export const updateCampaignRoute = app.post('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const body = (req.body || {}) as { campaignId?: unknown; settings?: unknown }
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : ''
  if (!campaignId) {
    return { success: false, error: 'Поле campaignId обязательно' }
  }

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  if (!access.hasAccess) {
    return { success: false, error: 'Нет доступа к кампании' }
  }

  const settings =
    body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings)
      ? (body.settings as Partial<CampaignSettings>)
      : undefined
  if (!settings) {
    return { success: false, error: 'Поле settings обязательно (объект)' }
  }

  const updated = await campaignRepo.updateCampaignSettings(ctx, campaignId, settings)
  if (!updated) {
    return { success: false, error: 'Кампания не найдена' }
  }

  return {
    success: true,
    campaign: {
      id: updated.id,
      title: updated.title,
      settings: updated.settings,
      updatedAt: updated.updatedAt
    }
  }
})
