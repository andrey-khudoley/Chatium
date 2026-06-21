// @shared-route
import { requireAccountRole } from '@app/auth'
import Campaigns from '../../../tables/campaigns.table'

/**
 * GET /api/admin/campaigns/list — список всех кампаний (для админки).
 * Только Admin. Возвращает id и title кампаний для выпадающего списка.
 */
export const listAdminCampaignsRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  try {
    const campaigns = await Campaigns.findAll(ctx, {
      limit: 1000,
      order: [{ updatedAt: 'desc' }]
    })

    const activeCampaigns = campaigns.filter((c) => c.isDeleted !== true)

    return {
      success: true,
      campaigns: activeCampaigns.map((c) => ({
        id: c.id,
        title: c.title || 'Без названия'
      }))
    }
  } catch (err) {
    ctx.account.log('error', '[admin/campaigns/list] Ошибка загрузки кампаний', {
      json: { error: String(err) }
    })
    return {
      success: false,
      error: (err as Error)?.message ?? String(err)
    }
  }
})
