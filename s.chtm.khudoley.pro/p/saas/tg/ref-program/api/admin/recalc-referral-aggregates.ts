// @shared-route
import { requireAccountRole } from '@app/auth'
import { recalcReferralAggregatesJob } from '../../jobs/recalc-referral-aggregates.job'

/**
 * POST /api/admin/recalc-referral-aggregates — поставить в очередь пересчёт агрегатов рефералов.
 * Только Admin. Не выполняет пересчёт сам: запускает джоб.
 *
 * Body:
 * - campaignId?: string — ID кампании для точечного пересчёта (опционально)
 *
 * Если campaignId не передан — выполняется глобальный пересчёт всех кампаний.
 * Если campaignId передан — пересчитывается только указанная кампания.
 */
export const recalcReferralAggregatesRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const campaignId =
    typeof req.body?.campaignId === 'string' ? req.body.campaignId.trim() : undefined

  try {
    recalcReferralAggregatesJob.scheduleJobAsap(ctx, {
      campaignOffset: 0,
      campaignIndex: 0,
      referralOffset: 0,
      campaignId
    })

    if (campaignId) {
      ctx.account.log(
        'info',
        '[recalc-referral-aggregates] Точечный пересчёт поставлен в очередь',
        { json: { campaignId } }
      )
    } else {
      ctx.account.log(
        'info',
        '[recalc-referral-aggregates] Глобальный пересчёт поставлен в очередь'
      )
    }

    return {
      success: true,
      jobScheduled: true,
      campaignId
    }
  } catch (err) {
    ctx.account.log('error', '[recalc-referral-aggregates] Ошибка постановки джоба', {
      json: { error: String(err), campaignId }
    })
    return {
      success: false,
      error: (err as Error)?.message ?? String(err)
    }
  }
})
