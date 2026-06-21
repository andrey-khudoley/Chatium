// @shared-route
import { requireRealUser } from '@app/auth'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as eventRepo from '../../lib/repo/eventRepo'

/**
 * GET /api/referrals/events?campaignId=…&ref=… — лог событий реферала (регистрация, заказы, оплаты).
 */
export const referralEventsRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const campaignId = typeof req.query?.campaignId === 'string' ? req.query.campaignId.trim() : ''
  const ref = typeof req.query?.ref === 'string' ? req.query.ref.trim() : ''
  if (!campaignId || !ref) {
    return { success: false, error: 'Параметры campaignId и ref обязательны' }
  }

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  if (!access.hasAccess) {
    return { success: false, error: 'Нет доступа к кампании' }
  }

  const events = await eventRepo.getReferralEventLog(ctx, campaignId, ref)
  return {
    success: true,
    ref,
    events
  }
})
