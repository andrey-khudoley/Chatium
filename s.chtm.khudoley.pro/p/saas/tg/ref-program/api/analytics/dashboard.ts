// @shared-route
import { requireRealUser } from '@app/auth'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as referralRepo from '../../lib/repo/referralRepo'
import Partners from '../../tables/partners.table'
import Referrals from '../../tables/referrals.table'
import ReferralAggregates from '../../tables/referral_aggregates.table'

/**
 * GET /api/analytics/dashboard?campaignId=… — агрегаты кампании и последние рефералы для дашборда.
 * Требуется авторизация и доступ к кампании.
 * Итоги заказов/оплат считаются по таблице referral_aggregates.
 */
export const dashboardRoute = app.get('/', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const campaignId = typeof req.query?.campaignId === 'string' ? req.query.campaignId.trim() : ''
  if (!campaignId) {
    return { success: false, error: 'Параметр campaignId обязателен' }
  }

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  if (!access.hasAccess) {
    return { success: false, error: 'Нет доступа к кампании' }
  }

  const [partnersCount, referralsCount, aggregatesRows, latestReferrals] = await Promise.all([
    Partners.countBy(ctx, { campaignId }),
    Referrals.countBy(ctx, { campaignId }),
    ReferralAggregates.findAll(ctx, {
      where: { campaignId },
      limit: 10000
    }),
    referralRepo.listReferrals(ctx, campaignId, { limit: 10, offset: 0 })
  ])

  let totalOrdersCount = 0
  let totalOrdersSum = 0
  let totalPaymentsCount = 0
  let totalPaymentsSum = 0
  for (const a of aggregatesRows) {
    totalOrdersCount += a.ordersCount ?? 0
    totalOrdersSum += a.ordersSum ?? 0
    totalPaymentsCount += a.paymentsCount ?? 0
    totalPaymentsSum += a.paymentsSum ?? 0
  }

  const latest = latestReferrals.referrals.map((r) => {
    const reg = (r as unknown as { registeredAt?: string | Date }).registeredAt
    const registeredAt =
      reg instanceof Date ? reg.toISOString() : typeof reg === 'string' ? reg : undefined
    return {
      id: r.id,
      ref: r.ref,
      name: r.name,
      email: r.email,
      registeredAt,
      ordersCount: r.ordersCount ?? 0,
      ordersSum: r.ordersSum ?? 0,
      paymentsCount: r.paymentsCount ?? 0,
      paymentsSum: r.paymentsSum ?? 0
    }
  })

  return {
    success: true,
    aggregates: {
      partnersCount,
      referralsCount,
      totalOrdersCount,
      totalOrdersSum,
      totalPaymentsCount,
      totalPaymentsSum
    },
    latestReferrals: latest
  }
})
