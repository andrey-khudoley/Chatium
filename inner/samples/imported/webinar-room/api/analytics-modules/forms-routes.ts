// @shared
import { requireAccountRole } from '@app/auth'
import { queryAi } from '@traffic/sdk'
import { reporterApp } from '../../shared/error-handler-middleware'
import { escapeSql } from '../../shared/sql-utils'
import { formActionToEventType, getWorkspacePath } from './utils'

// Сводная статистика по формам
// @shared-route
export const apiFormAnalyticsSummaryRoute = reporterApp.get('/forms-summary', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const episodeId = req.query.episodeId as string | undefined
  if (!episodeId) throw new Error('episodeId обязателен')

  const safeId = escapeSql(episodeId)
  const workspacePath = await getWorkspacePath(ctx)
  const FORM_EVENT_PREFIX = `event://custom/${workspacePath}/form_`

  const summaryQuery = `
    SELECT
      uniqIf(if(user_id != '', user_id, uid), action = 'form_shown') as totalShown,
      uniqIf(if(user_id != '', user_id, uid), action = 'form_opened') as totalOpened,
      uniqIf(if(user_id != '', user_id, uid), action = 'form_shown' OR action = 'form_opened') as totalSeen,
      uniqIf(if(user_id != '', user_id, uid), action = 'form_closed') as totalClosed,
      uniqIf(if(user_id != '', user_id, uid), action = 'form_field_focused') as totalFieldFocused,
      uniqIf(if(user_id != '', user_id, uid), action = 'form_submitted' OR urlPath = 'event://account/${workspacePath}/webinar_form_submitted') as totalSubmitted,
      uniqIf(if(user_id != '', user_id, uid), action = 'form_payment_page_opened') as totalPaymentPageOpened,
      uniqIf(if(user_id != '', user_id, uid), urlPath = 'event://account/${workspacePath}/webinar_form_payment_completed') as totalPaymentCompleted
    FROM chatium_ai.access_log
    WHERE (
        startsWith(urlPath, '${FORM_EVENT_PREFIX}')
        OR urlPath = 'event://account/${workspacePath}/webinar_form_payment_completed'
        OR urlPath = 'event://account/${workspacePath}/webinar_form_submitted'
      )
      AND action_param1 = '${safeId}'
  `

  const formStatsQuery = `
    SELECT
      action_param2 as formId,
      any(action_param3) as formTitle,
      uniqIf(if(user_id != '', user_id, uid), action = 'form_shown') as shown,
      uniqIf(if(user_id != '', user_id, uid), action = 'form_opened') as opened,
      uniqIf(if(user_id != '', user_id, uid), action = 'form_shown' OR action = 'form_opened') as seen,
      uniqIf(if(user_id != '', user_id, uid), action = 'form_field_focused') as fieldFocused,
      uniqIf(if(user_id != '', user_id, uid), action = 'form_submitted' OR urlPath = 'event://account/${workspacePath}/webinar_form_submitted') as submitted,
      uniqIf(if(user_id != '', user_id, uid), action = 'form_payment_page_opened') as paymentPageOpened,
      uniqIf(if(user_id != '', user_id, uid), urlPath = 'event://account/${workspacePath}/webinar_form_payment_completed') as paymentCompleted
    FROM chatium_ai.access_log
    WHERE (
        startsWith(urlPath, '${FORM_EVENT_PREFIX}')
        OR urlPath = 'event://account/${workspacePath}/webinar_form_payment_completed'
        OR urlPath = 'event://account/${workspacePath}/webinar_form_submitted'
      )
      AND action_param1 = '${safeId}'
    GROUP BY formId
    ORDER BY seen DESC
  `

  const [summaryResult, formStatsResult] = await Promise.all([
    queryAi(ctx, summaryQuery),
    queryAi(ctx, formStatsQuery)
  ])

  const summary = summaryResult.rows?.[0] || {}

  const formStats = (formStatsResult.rows || []).map((row: any) => {
    const shown = row.shown || 0
    const opened = row.opened || 0
    const seen = row.seen || 0
    const fieldFocused = row.fieldFocused || 0
    const submitted = row.submitted || 0
    const paymentPageOpened = row.paymentPageOpened || 0
    const paymentCompleted = row.paymentCompleted || 0

    return {
      formId: row.formId,
      formTitle: row.formTitle || 'Без названия',
      shown,
      opened,
      seen,
      fieldFocused,
      submitted,
      paymentPageOpened,
      paymentCompleted,
      conversionRate: seen > 0 ? Math.round((submitted / seen) * 100) : 0,
      paymentRate:
        paymentPageOpened > 0 ? Math.round((paymentCompleted / paymentPageOpened) * 100) : 0
    }
  })

  return {
    totalShown: summary.totalShown || 0,
    totalOpened: summary.totalOpened || 0,
    totalSeen: summary.totalSeen || 0,
    totalClosed: summary.totalClosed || 0,
    totalFieldFocused: summary.totalFieldFocused || 0,
    totalSubmitted: summary.totalSubmitted || 0,
    totalPaymentPageOpened: summary.totalPaymentPageOpened || 0,
    totalPaymentCompleted: summary.totalPaymentCompleted || 0,
    formStats
  }
})

// События форм с пагинацией
// @shared-route
export const apiFormAnalyticsListRoute = reporterApp.get('/forms-list', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const episodeId = req.query.episodeId as string | undefined
  const page = parseInt(req.query.page as string) || 1
  const limit = 100
  const offset = (page - 1) * limit

  const episodeFilter = episodeId ? `AND action_param1 = '${escapeSql(episodeId)}'` : ''
  const workspacePath = await getWorkspacePath(ctx)
  const FORM_EVENT_PREFIX = `event://custom/${workspacePath}/form_`

  const countQuery = `
    SELECT count() as cnt
    FROM chatium_ai.access_log
    WHERE (
        startsWith(urlPath, '${FORM_EVENT_PREFIX}')
        OR urlPath = 'event://account/${workspacePath}/webinar_form_payment_completed'
        OR urlPath = 'event://account/${workspacePath}/webinar_form_submitted'
      )
      ${episodeFilter}
  `

  const eventsQuery = `
    SELECT
      ts64,
      action,
      urlPath,
      action_param1 as episodeId,
      action_param2 as formId,
      action_param3 as formTitle,
      action_param1_float as amount,
      action_param1_mapstrstr as extraData,
      user_id,
      coalesce(user_first_name, '') as firstName,
      coalesce(user_last_name, '') as lastName,
      uid
    FROM chatium_ai.access_log
    WHERE (
        startsWith(urlPath, '${FORM_EVENT_PREFIX}')
        OR urlPath = 'event://account/${workspacePath}/webinar_form_payment_completed'
        OR urlPath = 'event://account/${workspacePath}/webinar_form_submitted'
      )
      ${episodeFilter}
    ORDER BY ts64 DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const [countResult, eventsResult] = await Promise.all([
    queryAi(ctx, countQuery),
    queryAi(ctx, eventsQuery)
  ])

  const totalCount = countResult.rows?.[0]?.cnt || 0
  const totalPages = Math.ceil(totalCount / limit)

  const events = (eventsResult.rows || []).map((row: any) => ({
    createdAt: row.ts64,
    eventType: formActionToEventType(row.action, row.urlPath || ''),
    episodeId: row.episodeId,
    formId: row.formId,
    formTitle: row.formTitle || 'Без названия',
    amount: row.amount || null,
    currency: row.extraData?.currency || null,
    userName: [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Аноним',
    userId: row.user_id
  }))

  return {
    events,
    totalCount,
    totalPages,
    page,
    limit
  }
})
