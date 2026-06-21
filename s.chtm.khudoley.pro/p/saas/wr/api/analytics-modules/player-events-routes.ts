// @shared
import { requireAccountRole } from '@app/auth'
import { queryAi } from '@traffic/sdk'
import { reporterApp } from '../../shared/error-handler-middleware'
import { escapeSql } from '../../shared/sql-utils'
import { actionToEventType, getWorkspacePath, resolveAnalyticsEntity } from './utils'
import type { CountResult, EventRow } from './types'

// Список событий с пагинацией
// @shared-route
export const apiPlayerAnalyticsListRoute = reporterApp.get('/list', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const episodeId = req.query.episodeId as string | undefined
  const page = parseInt(req.query.page as string) || 1
  const limit = 100
  const offset = (page - 1) * limit

  const workspacePath = await getWorkspacePath(ctx)
  const EVENT_PREFIX = `event://custom/${workspacePath}/player_`

  const episodeFilter = episodeId ? `AND action_param1 = '${escapeSql(episodeId)}'` : ''

  let episodeStartedAt: Date | null = null
  if (episodeId) {
    const entity = await resolveAnalyticsEntity(ctx, episodeId)
    if (entity?.startedAt) {
      episodeStartedAt = entity.startedAt
    }
  }

  const countQuery = `
    SELECT count() as cnt
    FROM chatium_ai.access_log
    WHERE startsWith(urlPath, '${EVENT_PREFIX}')
      ${episodeFilter}
  `

  const eventsQuery = `
    SELECT
      ts64,
      action,
      action_param1 as episodeId,
      action_param2 as sessionId,
      action_param3 as device,
      action_param1_float as currentTime,
      action_param2_float as duration,
      user_id,
      coalesce(user_first_name, '') as firstName,
      coalesce(user_last_name, '') as lastName,
      uid
    FROM chatium_ai.access_log
    WHERE startsWith(urlPath, '${EVENT_PREFIX}')
      ${episodeFilter}
    ORDER BY ts64 DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const [countResult, eventsResult] = await Promise.all([
    queryAi<CountResult>(ctx, countQuery),
    queryAi<EventRow>(ctx, eventsQuery)
  ])

  const totalCount = countResult.rows?.[0]?.cnt || 0
  const totalPages = Math.ceil(totalCount / limit)

  const events = (eventsResult.rows || []).map((row: any) => {
    let streamTimecode: number | null = null
    if (episodeStartedAt && row.ts64) {
      // Для эфиров: вычисляем по разнице времени события и начала эфира
      const eventTime = new Date(row.ts64).getTime()
      const diff = Math.floor((eventTime - episodeStartedAt.getTime()) / 1000)
      if (diff >= 0) streamTimecode = diff
    } else if (!episodeStartedAt && row.currentTime != null) {
      // Для автовебинаров: используем таймкод из плеера (action_param1_float)
      streamTimecode = Math.floor(row.currentTime)
    }
    return {
      createdAt: row.ts64,
      eventType: actionToEventType(row.action || ''),
      episodeId: row.episodeId,
      sessionId: row.sessionId,
      device: row.device,
      currentTime: row.currentTime,
      duration: row.duration,
      streamTimecode,
      userName: [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Аноним',
      userId: row.user_id
    }
  })

  return {
    events,
    totalCount,
    totalPages,
    page,
    limit
  }
})

// Экспорт сырых событий в CSV
// @shared-route
export const apiPlayerAnalyticsExportRoute = reporterApp.get('/export', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const episodeId = req.query.episodeId as string | undefined

  const workspacePath = await getWorkspacePath(ctx)
  const EVENT_PREFIX = `event://custom/${workspacePath}/player_`

  const episodeFilter = episodeId ? `AND action_param1 = '${escapeSql(episodeId)}'` : ''

  let episodeStartedAt: Date | null = null
  if (episodeId) {
    const entity = await resolveAnalyticsEntity(ctx, episodeId)
    if (entity?.startedAt) {
      episodeStartedAt = entity.startedAt
    }
  }

  const query = `
    SELECT
      ts64,
      action,
      action_param1 as episodeId,
      action_param2 as sessionId,
      action_param3 as device,
      action_param1_float as currentTime,
      action_param2_float as duration,
      user_id,
      coalesce(user_first_name, '') as firstName,
      coalesce(user_last_name, '') as lastName
    FROM chatium_ai.access_log
    WHERE startsWith(urlPath, '${EVENT_PREFIX}')
      ${episodeFilter}
    ORDER BY ts64 DESC
    LIMIT 10000
  `

  const result = await queryAi(ctx, query)
  const rows: Record<string, string>[] = []

  rows.push({
    date: 'Дата',
    user: 'Пользователь',
    eventType: 'Событие',
    streamTimecode: 'Таймкод эфира',
    duration: 'Длительность (сек)',
    device: 'Устройство',
    sessionId: 'Сессия'
  })

  for (const e of result.rows || []) {
    let timecodeStr = ''
    if (episodeStartedAt && e.ts64) {
      // Для эфиров: вычисляем по разнице времени
      const diff = Math.floor((new Date(e.ts64).getTime() - episodeStartedAt.getTime()) / 1000)
      if (diff >= 0) {
        const h = Math.floor(diff / 3600)
        const m = Math.floor((diff % 3600) / 60)
        const s = diff % 60
        timecodeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      }
    } else if (!episodeStartedAt && e.currentTime != null) {
      // Для автовебинаров: используем таймкод из плеера
      const diff = Math.floor(e.currentTime)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      timecodeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    rows.push({
      date: e.ts64 ? new Date(e.ts64).toISOString() : '',
      user: [e.firstName, e.lastName].filter(Boolean).join(' ') || 'Аноним',
      eventType: actionToEventType(e.action || ''),
      streamTimecode: timecodeStr,
      duration: e.duration != null ? String(Math.round(e.duration)) : '',
      device: e.device || '',
      sessionId: e.sessionId || ''
    })
  }

  const escCsv = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`

  const csvString = rows
    .map(
      (r) =>
        `${escCsv(r.date)},${escCsv(r.user)},${escCsv(r.eventType)},${escCsv(r.streamTimecode)},${escCsv(r.duration)},${escCsv(r.device)},${escCsv(r.sessionId)}`
    )
    .join('\r\n')

  return {
    statusCode: 200,
    rawHttpBody: csvString,
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-disposition': `attachment;filename=player-analytics-${episodeId || 'all'}.csv`
    }
  }
})
