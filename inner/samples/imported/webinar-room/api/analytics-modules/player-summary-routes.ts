// @shared
import { requireAccountRole } from '@app/auth'
import { queryAi } from '@traffic/sdk'
import { reporterApp } from '../../shared/error-handler-middleware'
import { escapeSql } from '../../shared/sql-utils'
import { actionToEventType, getWorkspacePath, resolveAnalyticsEntity } from './utils'

// Функция для подсчёта последовательных минут просмотра
// Прогресс считается последовательным, если разница между минутами < 2
function calculateSequentialMinutes(minutes: number[]): number {
  if (minutes.length === 0) return 0

  let total = 0
  let segmentStart = minutes[0]
  let segmentEnd = minutes[0]

  for (let i = 1; i < minutes.length; i++) {
    if (minutes[i] - minutes[i - 1] < 2) {
      segmentEnd = minutes[i]
    } else {
      total += segmentEnd - segmentStart + 1
      segmentStart = minutes[i]
      segmentEnd = minutes[i]
    }
  }

  total += segmentEnd - segmentStart + 1

  return total
}

// Сводная статистика по эфиру
// @shared-route
export const apiPlayerAnalyticsSummaryRoute = reporterApp.get('/summary', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const episodeId = req.query.episodeId as string | undefined
  if (!episodeId) {
    throw new Error('episodeId обязателен')
  }

  const entity = await resolveAnalyticsEntity(ctx, episodeId)
  if (!entity) {
    throw new Error('Эфир или автовебинар не найден')
  }

  // Для автовебинаров нет конкретного startedAt — используем данные из Clickhouse
  // Для эфиров — из таблицы
  const hasStartedAt = entity.type === 'episode' && entity.startedAt

  if (!hasStartedAt && entity.type === 'episode') {
    return {
      uniqueViewers: 0,
      totalPlays: 0,
      totalCompleted: 0,
      totalPauses: 0,
      totalSeeks: 0,
      deviceStats: [],
      eventTypeStats: [],
      countryStats: [],
      avgEngagement: 0,
      completionRate: 0,
      peakViewers: 0,
      peakViewersTimeFromStart: null,
      retentionCurve: [],
      sessionsStats: { singleSession: 0, multiSession: 0 },
      newViewers: 0,
      returningViewers: 0,
      avgWatchTimeSeconds: 0
    }
  }

  const safeId = escapeSql(episodeId)
  const workspacePath = await getWorkspacePath(ctx)
  const EVENT_PREFIX = `event://custom/${workspacePath}/player_`

  // Для автовебинаров: startedAt берём из первого события в Clickhouse
  // Для эфиров: из таблицы
  const startedAtStr = hasStartedAt
    ? `toDateTime('${new Date(entity.startedAt!)
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z$/, '')}', 'UTC')`
    : `(SELECT min(ts64) FROM chatium_ai.access_log WHERE startsWith(urlPath, '${EVENT_PREFIX}') AND action_param1 = '${safeId}')`

  const summaryQuery = `
    SELECT
      uniq(if(action = 'player_play', if(user_id != '', user_id, uid), null)) as uniqueViewers,
      countIf(action = 'player_play') as totalPlays,
      countIf(action = 'player_ended') as totalCompleted,
      countIf(action = 'player_pause') as totalPauses,
      countIf(action = 'player_seek') as totalSeeks
    FROM chatium_ai.access_log
    WHERE startsWith(urlPath, '${EVENT_PREFIX}')
      AND action_param1 = '${safeId}'
  `

  const deviceQuery = `
    SELECT
      action_param3 as device,
      uniq(if(user_id != '', user_id, uid)) as cnt
    FROM chatium_ai.access_log
    WHERE startsWith(urlPath, '${EVENT_PREFIX}')
      AND action = 'player_play'
      AND action_param1 = '${safeId}'
    GROUP BY device
    ORDER BY cnt DESC
  `

  const eventTypeQuery = `
    SELECT
      action,
      count() as cnt
    FROM chatium_ai.access_log
    WHERE startsWith(urlPath, '${EVENT_PREFIX}')
      AND action_param1 = '${safeId}'
    GROUP BY action
    ORDER BY cnt DESC
  `

  // Длительность: для эфиров из таблицы, для автовебинаров — из autowebinar.duration
  const streamDurationSeconds = entity.durationSeconds || 1

  // Для автовебинаров используем таймкод видео из плеера (action_param1_float),
  // а не разницу времени между событиями
  const minuteCalculation = hasStartedAt
    ? `toInt64(dateDiff('minute', ${startedAtStr}, ts64))`
    : `toInt64(action_param1_float / 60)`

  const engagementQuery = `
    SELECT
      if(user_id != '', user_id, uid) as viewer_id,
      arraySort(groupUniqArray(${minuteCalculation})) as minutes_array
    FROM chatium_ai.access_log
    WHERE startsWith(urlPath, '${EVENT_PREFIX}')
      AND action = 'player_progress'
      AND action_param1 = '${safeId}'
    GROUP BY viewer_id
  `

  const countryQuery = `
    SELECT
      coalesce(nullIf(location_country, ''), 'Unknown') as country,
      uniq(if(user_id != '', user_id, uid)) as cnt
    FROM chatium_ai.access_log
    WHERE startsWith(urlPath, '${EVENT_PREFIX}')
      AND action = 'player_play'
      AND action_param1 = '${safeId}'
    GROUP BY country
    ORDER BY cnt DESC
    LIMIT 10
  `

  const peakViewersQuery = `
    WITH first_event AS (
      SELECT ${startedAtStr} as start_time
      FROM chatium_ai.access_log
      WHERE startsWith(urlPath, '${EVENT_PREFIX}')
        AND action_param1 = '${safeId}'
      LIMIT 1
    ),
    peak_period AS (
      SELECT
        toStartOfMinute(ts64) as period,
        uniq(if(user_id != '', user_id, uid)) as viewers
      FROM chatium_ai.access_log
      WHERE startsWith(urlPath, '${EVENT_PREFIX}')
        AND action_param1 = '${safeId}'
      GROUP BY period
      ORDER BY viewers DESC
      LIMIT 1
    )
    SELECT
      viewers,
      dateDiff('second', (SELECT start_time FROM first_event), period) as timeFromStart
    FROM peak_period
  `

  // Retention Curve: показывает % удержания по минутам контента
  // Для episodes: группируем по dateDiff от startedAt (минуты эфира)
  // Для autowebinars: группируем по таймкоду видео из плеера (action_param1_float / 60)
  const retentionCurveQuery = `
    WITH
      minute_viewers AS (
        SELECT
          ${minuteCalculation} as stream_minute,
          uniq(if(user_id != '', user_id, uid)) as viewers
        FROM chatium_ai.access_log
        WHERE startsWith(urlPath, '${EVENT_PREFIX}')
          AND action = 'player_progress'
          AND action_param1 = '${safeId}'
        GROUP BY stream_minute
        HAVING stream_minute >= 0
      ),
      peak AS (
        SELECT max(viewers) as peak_viewers FROM minute_viewers
      )
    SELECT
      stream_minute as minute,
      viewers as retainedViewers,
      round(viewers * 100.0 / greatest((SELECT peak_viewers FROM peak), 1), 1) as retentionPercent
    FROM minute_viewers
    ORDER BY minute ASC
  `

  const viewerSessionsQuery = `
    SELECT
      uniq(action_param2) as sessions,
      count() as viewersCount
    FROM (
      SELECT
        if(user_id != '', user_id, uid) as viewer_id,
        action_param2
      FROM chatium_ai.access_log
      WHERE startsWith(urlPath, '${EVENT_PREFIX}')
        AND action = 'player_play'
        AND action_param1 = '${safeId}'
      GROUP BY viewer_id, action_param2
    )
    GROUP BY viewer_id
    HAVING sessions > 0
    ORDER BY sessions
  `

  const newVsReturningQuery = `
    WITH episode_viewers AS (
      SELECT DISTINCT if(user_id != '', user_id, uid) as viewer_id
      FROM chatium_ai.access_log
      WHERE startsWith(urlPath, '${EVENT_PREFIX}')
        AND action = 'player_play'
        AND action_param1 = '${safeId}'
    ),
    previous_viewers AS (
      SELECT DISTINCT if(user_id != '', user_id, uid) as viewer_id
      FROM chatium_ai.access_log
      WHERE startsWith(urlPath, '${EVENT_PREFIX}')
        AND action = 'player_play'
        AND action_param1 != '${safeId}'
    )
    SELECT
      countIf(viewer_id IN (SELECT viewer_id FROM previous_viewers)) as returningViewers,
      countIf(viewer_id NOT IN (SELECT viewer_id FROM previous_viewers)) as newViewers
    FROM episode_viewers
  `

  const avgWatchTimeQuery = `
    WITH viewer_session_duration AS (
      SELECT
        if(user_id != '', user_id, uid) as viewer_id,
        dateDiff('second', min(ts64), max(ts64)) as sessionDurationSeconds
      FROM chatium_ai.access_log
      WHERE startsWith(urlPath, '${EVENT_PREFIX}')
        AND action_param1 = '${safeId}'
      GROUP BY viewer_id
    )
    SELECT round(avg(sessionDurationSeconds), 0) as avgWatchTimeSeconds
    FROM viewer_session_duration
  `

  const [
    summaryResult,
    deviceResult,
    eventTypeResult,
    engagementResult,
    countryResult,
    peakViewersResult,
    retentionCurveResult,
    viewerSessionsResult,
    newVsReturningResult,
    avgWatchTimeResult
  ] = await Promise.all([
    queryAi(ctx, summaryQuery),
    queryAi(ctx, deviceQuery),
    queryAi(ctx, eventTypeQuery),
    queryAi(ctx, engagementQuery),
    queryAi(ctx, countryQuery),
    queryAi(ctx, peakViewersQuery),
    queryAi(ctx, retentionCurveQuery),
    queryAi(ctx, viewerSessionsQuery),
    queryAi(ctx, newVsReturningQuery),
    queryAi(ctx, avgWatchTimeQuery)
  ])

  const summary = summaryResult.rows?.[0] || {}

  const deviceStats = (deviceResult.rows || []).map((row: any) => ({
    deviceType: row.device || 'unknown',
    count: row.cnt
  }))

  const eventTypeStats = (eventTypeResult.rows || []).map((row: any) => ({
    type: actionToEventType(row.action || ''),
    count: row.cnt
  }))

  const countryStats = (countryResult.rows || []).map((row: any) => ({
    country: row.country || 'Unknown',
    count: row.cnt
  }))

  const engagementSessions = engagementResult.rows || []
  const effectiveDuration = streamDurationSeconds > 0 ? streamDurationSeconds : 1
  const avgEngagement =
    engagementSessions.length > 0
      ? Math.round(
          engagementSessions.reduce((sum: number, s: any) => {
            const minutesArray = s.minutes_array || []
            const sequentialMinutes = calculateSequentialMinutes(minutesArray)
            const watchedSeconds = sequentialMinutes * 60
            const engagementPercent = Math.min((watchedSeconds / effectiveDuration) * 100, 100)
            return sum + engagementPercent
          }, 0) / engagementSessions.length
        )
      : 0

  const totalPlays = summary.totalPlays || 0
  const totalCompleted = summary.totalCompleted || 0

  const peakViewers = peakViewersResult.rows?.[0] || {}

  // Заполняем retention curve всеми минутами от 0 до конца эфира
  const retentionCurveRaw = (retentionCurveResult.rows || []).map((row: any) => ({
    minute: row.minute,
    retainedViewers: row.retainedViewers || 0,
    retentionPercent: row.retentionPercent || 0
  }))

  // Определяем максимальную минуту
  let maxMinute = 0
  if (entity.type === 'episode' && entity.startedAt) {
    const startTime = entity.startedAt.getTime()
    const endTime = entity.finishedAt ? entity.finishedAt.getTime() : Date.now()
    maxMinute = Math.floor((endTime - startTime) / (60 * 1000))
  } else {
    maxMinute = Math.ceil(entity.durationSeconds / 60)
  }

  // Создаём полный массив минут с нулями
  const retentionCurveMap = new Map<
    number,
    { minute: number; retainedViewers: number; retentionPercent: number }
  >()
  for (let i = 0; i <= maxMinute; i++) {
    retentionCurveMap.set(i, { minute: i, retainedViewers: 0, retentionPercent: 0 })
  }

  // Заполняем реальными данными
  for (const row of retentionCurveRaw) {
    retentionCurveMap.set(row.minute, row)
  }

  const retentionCurve = Array.from(retentionCurveMap.values()).sort((a, b) => a.minute - b.minute)

  const sessionsStats = (viewerSessionsResult.rows || []).reduce(
    (acc: any, row: any) => {
      const sessions = row.sessions
      const count = row.viewersCount
      if (sessions === 1) acc.singleSession += count
      else if (sessions >= 2) acc.multiSession += count
      return acc
    },
    { singleSession: 0, multiSession: 0 }
  )

  const newVsReturning = newVsReturningResult.rows?.[0] || { newViewers: 0, returningViewers: 0 }

  const avgWatchTime = avgWatchTimeResult.rows?.[0]?.avgWatchTimeSeconds || 0

  return {
    uniqueViewers: summary.uniqueViewers || 0,
    totalPlays,
    totalCompleted,
    totalPauses: summary.totalPauses || 0,
    totalSeeks: summary.totalSeeks || 0,
    deviceStats,
    eventTypeStats,
    countryStats,
    avgEngagement,
    completionRate: totalPlays > 0 ? Math.round((totalCompleted / totalPlays) * 100) : 0,
    peakViewers: peakViewers.viewers || 0,
    peakViewersTimeFromStart: peakViewers.timeFromStart || null,
    retentionCurve,
    sessionsStats,
    newViewers: newVsReturning.newViewers || 0,
    returningViewers: newVsReturning.returningViewers || 0,
    avgWatchTimeSeconds: avgWatchTime
  }
})

// Timeline — активность зрителей по времени (по минутным интервалам)
// Используем dateDiff от startedAt для группировки — это гарантирует совпадение ключей JS и Clickhouse
// @shared-route
export const apiPlayerAnalyticsTimelineRoute = reporterApp.get('/timeline', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const episodeId = req.query.episodeId as string
  if (!episodeId) throw new Error('episodeId обязателен')

  const entity = await resolveAnalyticsEntity(ctx, episodeId)
  if (!entity) {
    return { timeline: [] }
  }

  if (entity.type === 'episode' && !entity.startedAt) {
    return { timeline: [] }
  }

  const safeId = escapeSql(episodeId)
  const workspacePath = await getWorkspacePath(ctx)
  const EVENT_PREFIX = `event://custom/${workspacePath}/player_`

  const useDbStartTime = entity.type === 'episode' && entity.startedAt

  let startTime: Date
  let totalMinutes: number
  let startedAtClickhouse: string

  if (useDbStartTime) {
    startTime = entity.startedAt!
    const endTime = entity.finishedAt || new Date()
    totalMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (60 * 1000))
    startedAtClickhouse = startTime
      .toISOString()
      .replace('T', ' ')
      .replace(/\.\d+Z$/, '')
  } else {
    // Для автовебинаров: используем длительность видео, а начало берём из первого события
    totalMinutes = Math.ceil(entity.durationSeconds / 60)
    startTime = new Date() // placeholder, не используется для label
    startedAtClickhouse = '' // не используется
  }

  // Для автовебинаров группируем по offsetSeconds от первого события
  const startRef = useDbStartTime
    ? `toDateTime('${startedAtClickhouse}', 'UTC')`
    : `(SELECT min(ts64) FROM chatium_ai.access_log WHERE startsWith(urlPath, '${EVENT_PREFIX}') AND action_param1 = '${safeId}')`

  const query = `
    SELECT
      toInt64(dateDiff('minute', ${startRef}, ts64)) as stream_minute,
      uniq(if(user_id != '', user_id, uid)) as viewers,
      count() as events
    FROM chatium_ai.access_log
    WHERE startsWith(urlPath, '${EVENT_PREFIX}')
      AND action_param1 = '${safeId}'
    GROUP BY stream_minute
    HAVING stream_minute >= 0 AND stream_minute <= ${totalMinutes + 1}
    ORDER BY stream_minute ASC
  `

  const result = await queryAi(ctx, query)

  // Строим Map по минутам эфира из Clickhouse
  const minuteData = new Map<number, { viewers: number; events: number }>()
  for (const row of result.rows || []) {
    minuteData.set(Number(row.stream_minute), {
      viewers: row.viewers,
      events: row.events
    })
  }

  // Строим полный временной ряд от 0 до totalMinutes
  const timeline: { minute: number; period: string; viewers: number; events: number }[] = []
  for (let m = 0; m <= totalMinutes; m++) {
    const periodDate = useDbStartTime
      ? new Date(startTime.getTime() + m * 60 * 1000)
      : new Date(Date.now() - (totalMinutes - m) * 60 * 1000) // placeholder
    const data = minuteData.get(m)
    timeline.push({
      minute: m,
      period: periodDate.toISOString(),
      viewers: data?.viewers || 0,
      events: data?.events || 0
    })
  }

  return { timeline }
})
