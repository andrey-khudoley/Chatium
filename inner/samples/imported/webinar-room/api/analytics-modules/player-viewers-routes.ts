// @shared
import { requireAccountRole } from '@app/auth'
import { queryAi } from '@traffic/sdk'
import { reporterApp } from '../../shared/error-handler-middleware'
import { escapeSql } from '../../shared/sql-utils'
import { getWorkspacePath, resolveAnalyticsEntity } from './utils'

// Функция для подсчёта последовательных минут просмотра
// Прогресс считается последовательным, если разница между минутами < 2
function calculateSequentialMinutes(minutes: number[]): number {
  if (minutes.length === 0) return 0

  // Массив уже отсортирован в SQL через arraySort
  let total = 0
  let segmentStart = minutes[0]
  let segmentEnd = minutes[0]

  for (let i = 1; i < minutes.length; i++) {
    if (minutes[i] - minutes[i - 1] < 2) {
      // Продолжаем текущий отрезок
      segmentEnd = minutes[i]
    } else {
      // Завершаем текущий отрезок и начинаем новый
      total += segmentEnd - segmentStart + 1
      segmentStart = minutes[i]
      segmentEnd = minutes[i]
    }
  }

  // Добавляем последний отрезок
  total += segmentEnd - segmentStart + 1

  return total
}

// Зрители (все: авторизованные и анонимные)
// @shared-route
export const apiPlayerAnalyticsViewersRoute = reporterApp.get('/viewers', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const episodeId = req.query.episodeId as string
  if (!episodeId) throw new Error('episodeId обязателен')

  const page = parseInt(req.query.page as string) || 1
  const limit = 50
  const offset = (page - 1) * limit

  // Сортировка и фильтрация
  const sortBy = (req.query.sortBy as string) || 'firstSeen' // 'firstSeen' | 'engagement'
  const sortOrder = (req.query.sortOrder as string) || 'desc' // 'asc' | 'desc'
  const paymentFilter = (req.query.paymentFilter as string) || 'all' // 'all' | 'paid' | 'not_paid'

  const safeId = escapeSql(episodeId)
  const workspacePath = await getWorkspacePath(ctx)
  const EVENT_PREFIX = `event://custom/${workspacePath}/player_`
  const FORM_EVENT_PREFIX = `event://custom/${workspacePath}/form_`

  const entity = await resolveAnalyticsEntity(ctx, episodeId)
  const startedAtStr = entity?.startedAt
    ? `toDateTime('${entity.startedAt
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z$/, '')}', 'UTC')`
    : null

  const streamDurationSeconds = entity?.durationSeconds || 0

  // Подсчёт с учётом фильтра по оплате
  const countQuery =
    paymentFilter === 'all'
      ? `
    SELECT uniq(if(user_id != '', user_id, uid)) as cnt
    FROM chatium_ai.access_log
    WHERE startsWith(urlPath, '${EVENT_PREFIX}')
      AND action_param1 = '${safeId}'
  `
      : `
    WITH ${startedAtStr ? `episode_start AS (SELECT ${startedAtStr} as start_time),` : `episode_start AS (SELECT min(ts64) as start_time FROM chatium_ai.access_log WHERE startsWith(urlPath, '${EVENT_PREFIX}') AND action_param1 = '${safeId}'),`}
    viewer_analytics AS (
      SELECT if(user_id != '', user_id, uid) as viewer_id
      FROM chatium_ai.access_log
      WHERE startsWith(urlPath, '${EVENT_PREFIX}') AND action_param1 = '${safeId}'
      GROUP BY viewer_id
    ),
    viewer_payments AS (
      SELECT if(user_id != '', user_id, uid) as payer_id, sum(action_param1_float) as totalPaid
      FROM chatium_ai.access_log
      WHERE (startsWith(urlPath, '${FORM_EVENT_PREFIX}payment_completed') OR urlPath = 'event://account/${workspacePath}/webinar_form_payment_completed')
        AND action_param1 = '${safeId}'
      GROUP BY payer_id
    )
    SELECT count(*) as cnt FROM viewer_analytics va
    LEFT JOIN viewer_payments vp ON va.viewer_id = vp.payer_id
    ${paymentFilter === 'paid' ? 'WHERE vp.totalPaid > 0' : 'WHERE (vp.totalPaid IS NULL OR vp.totalPaid = 0)'}
  `

  const viewersQuery = `
    WITH ${startedAtStr ? `episode_start AS (SELECT ${startedAtStr} as start_time),` : `episode_start AS (SELECT min(ts64) as start_time FROM chatium_ai.access_log WHERE startsWith(urlPath, '${EVENT_PREFIX}') AND action_param1 = '${safeId}'),`}
    viewer_analytics AS (
      SELECT
        if(user_id != '', user_id, uid) as viewer_id,
        any(user_id) as orig_user_id,
        any(uid) as orig_uid,
        anyIf(user_first_name, user_first_name != '') as firstName,
        anyIf(user_last_name, user_last_name != '') as lastName,
        anyIf(user_email, user_email != '') as email,
        anyIf(user_phone, user_phone != '') as phone,
        any(action_param3) as device,
        min(ts64) as firstSeen,
        max(ts64) as lastSeen,
        countIf(action = 'player_play') as plays,
        countIf(action = 'player_pause') as pauses,
        countIf(action = 'player_ended') as completions,
        countIf(action = 'player_seek') as seeks,
        arraySort(groupUniqArrayIf(toInt64(dateDiff('minute', (SELECT start_time FROM episode_start), ts64)), action = 'player_progress')) as minutes_array
      FROM chatium_ai.access_log
      WHERE startsWith(urlPath, '${EVENT_PREFIX}')
        AND action_param1 = '${safeId}'
      GROUP BY viewer_id
    ),
    viewer_payments AS (
      SELECT
        if(user_id != '', user_id, uid) as payer_id,
        sum(action_param1_float) as totalPaid,
        any(action_param1_mapstrstr['currency']) as currency
      FROM chatium_ai.access_log
      WHERE (startsWith(urlPath, '${FORM_EVENT_PREFIX}payment_completed')
        OR urlPath = 'event://account/${workspacePath}/webinar_form_payment_completed')
        AND action_param1 = '${safeId}'
      GROUP BY payer_id
    )
    SELECT
      va.*,
      coalesce(vp.totalPaid, 0) as totalPaid,
      vp.currency as currency
    FROM viewer_analytics va
    LEFT JOIN viewer_payments vp ON va.viewer_id = vp.payer_id
    ${paymentFilter === 'paid' ? 'WHERE vp.totalPaid > 0' : paymentFilter === 'not_paid' ? 'WHERE (vp.totalPaid IS NULL OR vp.totalPaid = 0)' : ''}
    ORDER BY ${sortBy === 'engagement' ? 'length(va.minutes_array)' : 'va.firstSeen'} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
    LIMIT ${limit} OFFSET ${offset}
  `

  const [countResult, viewersResult] = await Promise.all([
    queryAi(ctx, countQuery),
    queryAi(ctx, viewersQuery)
  ])

  const totalCount = countResult.rows?.[0]?.cnt || 0
  const totalPages = Math.ceil(totalCount / limit)

  const viewers = (viewersResult.rows || []).map((row: any) => {
    const minutesArray = row.minutes_array || []
    const sequentialMinutes = calculateSequentialMinutes(minutesArray)
    const watchedSeconds = sequentialMinutes * 60
    const engagementPercent =
      streamDurationSeconds > 0 ? Math.round((watchedSeconds / streamDurationSeconds) * 100) : 0

    return {
      userId: row.orig_user_id || null,
      isAnonymous: !row.orig_user_id,
      name: [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Аноним',
      email: row.email || null,
      phone: row.phone || null,
      device: row.device || 'unknown',
      firstSeen: row.firstSeen,
      lastSeen: row.lastSeen,
      plays: row.plays || 0,
      pauses: row.pauses || 0,
      completions: row.completions || 0,
      seeks: row.seeks || 0,
      engagementPercent: Math.min(engagementPercent, 100),
      watchedSeconds,
      totalPaid: row.totalPaid || 0,
      currency: row.currency || 'RUB'
    }
  })

  return { viewers, totalCount, totalPages, page, limit }
})

// Экспорт всех зрителей (авторизованных и анонимных) в CSV
// @shared-route
export const apiPlayerAnalyticsViewersExportRoute = reporterApp.get(
  '/viewers-export',
  async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const episodeId = req.query.episodeId as string
    if (!episodeId) throw new Error('episodeId обязателен')

    const safeId = escapeSql(episodeId)
    const workspacePath = await getWorkspacePath(ctx)
    const EVENT_PREFIX = `event://custom/${workspacePath}/player_`
    const FORM_EVENT_PREFIX = `event://custom/${workspacePath}/form_`

    const entityExp = await resolveAnalyticsEntity(ctx, episodeId)
    const startedAtStrExp = entityExp?.startedAt
      ? `toDateTime('${entityExp.startedAt
          .toISOString()
          .replace('T', ' ')
          .replace(/\.\d+Z$/, '')}', 'UTC')`
      : null

    const exportStreamDurationSeconds = entityExp?.durationSeconds || 0

    const query = `
    WITH ${startedAtStrExp ? `episode_start AS (SELECT ${startedAtStrExp} as start_time),` : `episode_start AS (SELECT min(ts64) as start_time FROM chatium_ai.access_log WHERE startsWith(urlPath, '${EVENT_PREFIX}') AND action_param1 = '${safeId}'),`}
    viewer_analytics AS (
      SELECT
        if(user_id != '', user_id, uid) as viewer_id,
        any(user_id) as orig_user_id,
        anyIf(user_first_name, user_first_name != '') as firstName,
        anyIf(user_last_name, user_last_name != '') as lastName,
        anyIf(user_email, user_email != '') as email,
        anyIf(user_phone, user_phone != '') as phone,
        any(action_param3) as device,
        min(ts64) as firstSeen,
        max(ts64) as lastSeen,
        countIf(action = 'player_play') as plays,
        countIf(action = 'player_ended') as completions,
        arraySort(groupUniqArrayIf(toInt64(dateDiff('minute', (SELECT start_time FROM episode_start), ts64)), action = 'player_progress')) as minutes_array
      FROM chatium_ai.access_log
      WHERE startsWith(urlPath, '${EVENT_PREFIX}')
        AND action_param1 = '${safeId}'
      GROUP BY viewer_id
    ),
    viewer_payments AS (
      SELECT
        if(user_id != '', user_id, uid) as payer_id,
        sum(action_param1_float) as totalPaid,
        any(action_param1_mapstrstr['currency']) as currency
      FROM chatium_ai.access_log
      WHERE (startsWith(urlPath, '${FORM_EVENT_PREFIX}payment_completed')
        OR urlPath = 'event://account/${workspacePath}/webinar_form_payment_completed')
        AND action_param1 = '${safeId}'
      GROUP BY payer_id
    )
    SELECT
      va.*,
      coalesce(vp.totalPaid, 0) as totalPaid,
      vp.currency as currency
    FROM viewer_analytics va
    LEFT JOIN viewer_payments vp ON va.viewer_id = vp.payer_id
    ORDER BY va.firstSeen DESC
    LIMIT 10000
  `

    const result = await queryAi(ctx, query)
    const rows: Record<string, string>[] = []

    rows.push({
      name: 'Имя',
      email: 'Email',
      phone: 'Телефон',
      device: 'Устройство',
      firstSeen: 'Первый визит',
      lastSeen: 'Последний визит',
      plays: 'Запусков',
      completions: 'Досмотров',
      engagementPercent: 'Просмотренность %',
      watchedTime: 'Время просмотра',
      totalPaid: 'Оплата'
    })

    for (const r of result.rows || []) {
      const minutesArray = r.minutes_array || []
      const sequentialMinutes = calculateSequentialMinutes(minutesArray)
      const watchedSeconds = sequentialMinutes * 60
      const engagementPercent =
        exportStreamDurationSeconds > 0
          ? Math.round((watchedSeconds / exportStreamDurationSeconds) * 100)
          : 0
      const watchedMinutes = Math.floor(watchedSeconds / 60)
      const watchedSecondsRemainder = watchedSeconds % 60

      const totalPaid = r.totalPaid || 0
      const currency = r.currency || 'RUB'
      const paymentStr = totalPaid > 0 ? `${totalPaid} ${currency}` : '-'

      rows.push({
        name: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Аноним',
        email: r.email || '',
        phone: r.phone || '',
        device: r.device || '',
        firstSeen: r.firstSeen ? new Date(r.firstSeen).toISOString() : '',
        lastSeen: r.lastSeen ? new Date(r.lastSeen).toISOString() : '',
        plays: String(r.plays || 0),
        completions: String(r.completions || 0),
        engagementPercent: String(Math.min(engagementPercent, 100)),
        watchedTime: `${watchedMinutes}:${String(watchedSecondsRemainder).padStart(2, '0')}`,
        totalPaid: paymentStr
      })
    }

    const escCsv = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`
    const keys = [
      'name',
      'email',
      'phone',
      'device',
      'firstSeen',
      'lastSeen',
      'plays',
      'completions',
      'engagementPercent',
      'watchedTime',
      'totalPaid'
    ]
    const csvString = rows.map((r) => keys.map((k) => escCsv(r[k])).join(',')).join('\r\n')

    return {
      statusCode: 200,
      rawHttpBody: csvString,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-disposition': `attachment;filename=viewers-${episodeId}.csv`
      }
    }
  }
)
