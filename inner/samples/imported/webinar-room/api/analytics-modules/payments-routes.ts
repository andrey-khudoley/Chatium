// @shared
import { requireAccountRole } from '@app/auth'
import { queryAi } from '@traffic/sdk'
import { reporterApp } from '../../shared/error-handler-middleware'
import { escapeSql } from '../../shared/sql-utils'
import { getWorkspacePath } from './utils'

// Сводка по оплатам зрителей
// @shared-route
export const apiViewersPaymentsSummaryRoute = reporterApp.get(
  '/viewers-payments-summary',
  async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const episodeId = req.query.episodeId as string
    if (!episodeId) throw new Error('episodeId обязателен')

    const safeId = escapeSql(episodeId)
    const workspacePath = await getWorkspacePath(ctx)
    const EVENT_PREFIX = `event://custom/${workspacePath}/player_`
    const FORM_EVENT_PREFIX = `event://custom/${workspacePath}/form_`

    // Подсчёт успешных оплат по эфиру
    const paymentsQuery = `
    SELECT
      count(DISTINCT if(user_id != '', user_id, uid)) as paidViewersCount,
      sum(action_param1_float) as totalRevenue,
      any(action_param1_mapstrstr['currency']) as currency
    FROM chatium_ai.access_log
    WHERE (startsWith(urlPath, '${FORM_EVENT_PREFIX}payment_completed')
      OR urlPath = 'event://account/${workspacePath}/webinar_form_payment_completed')
      AND action_param1 = '${safeId}'
  `

    // Подсчёт уникальных зрителей
    const viewersCountQuery = `
    SELECT uniq(if(user_id != '', user_id, uid)) as totalViewers
    FROM chatium_ai.access_log
    WHERE startsWith(urlPath, '${EVENT_PREFIX}')
      AND action = 'player_play'
      AND action_param1 = '${safeId}'
  `

    const [paymentsResult, viewersResult] = await Promise.all([
      queryAi(ctx, paymentsQuery),
      queryAi(ctx, viewersCountQuery)
    ])

    const paymentsData = paymentsResult.rows?.[0] || {}
    const viewersData = viewersResult.rows?.[0] || {}

    const paidViewersCount = paymentsData.paidViewersCount || 0
    const totalRevenue = paymentsData.totalRevenue || 0
    const currency = paymentsData.currency || 'RUB'
    const totalViewers = viewersData.totalViewers || 0
    const notPaidViewersCount = totalViewers - paidViewersCount

    return {
      paidViewersCount,
      notPaidViewersCount,
      totalRevenue,
      currency,
      totalViewers
    }
  }
)
