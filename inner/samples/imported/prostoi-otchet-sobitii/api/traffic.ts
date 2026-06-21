import { requireAccountRole } from '@app/auth'
import { queryAi } from '@traffic/sdk'

// @shared-route
export const apiRecentVisitsRoute = app.get('/recent-visits', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const { dateFrom, dateTo, url, userId, page = '1', limit = '20' } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)

  let whereClause = `
    dt BETWEEN '${dateFrom || '2024-01-01'}' AND '${dateTo || new Date().toISOString().split('T')[0]}'
  `

  if (url && url.trim()) {
    if (url.startsWith('https://') || url.startsWith('event://')) {
      whereClause += ` AND startsWith(url, '${url.trim()}')`
    } else {
      whereClause += ` AND startsWith(urlPath, '${url.trim()}')`
    }
  }

  if (userId && userId.trim()) {
    const searchTerm = userId.trim()
    whereClause += ` AND (
      resolved_user_id = '${searchTerm}' OR
      COALESCE(user_first_name, '') ILIKE '%${searchTerm}%' OR
      COALESCE(user_last_name, '') ILIKE '%${searchTerm}%' OR
      COALESCE(user_email, '') ILIKE '%${searchTerm}%')`
  }

  // First get all events grouped by session
  const eventsQuery = `
    SELECT 
      clrt_run_id as clrt_run_id,
      ts,
      ts64,
      url,
      urlPath,
      action,
      action_param1,
      action_param2, 
      action_param3,
      COALESCE(user_first_name, '') || ' ' || COALESCE(user_last_name, '') as user_name,
      user_account_role,
      user_email,
      COALESCE(ua_device_type, '') || ' ' || COALESCE(ua_device_brand, '') || ' ' || COALESCE(ua_os_name, '') as device_info,
      COALESCE(location_city, '') || ' ' || COALESCE(location_country, '') as location,
      resolved_user_id
    FROM 
      chatium_ai.access_log
    WHERE
      ${whereClause}
    ORDER BY 
      ts DESC
  `

  const response = await queryAi(ctx, eventsQuery)
  ctx.log(response)

  if (!response.rows?.length) {
    return { rows: [], data: { total: 0, page: parseInt(page), limit: parseInt(limit) } }
  }

  // Group events by clrt_run_id and structure parent/child relationships
  const groupedEvents = new Map()

  for (const event of response.rows) {
    // Only group if clrt_run_id exists and is not 0
    if (!event.clrt_run_id || event.clrt_run_id === '0') {
      // Treat as standalone event
      const standaloneId = `${event.url}/${event.ts64}`
      groupedEvents.set(standaloneId, {
        parent: { ...event, id: standaloneId },
        children: []
      })
      continue
    }

    const sessionId = event.clrt_run_id

    if (!groupedEvents.has(sessionId)) {
      groupedEvents.set(sessionId, { events: [] })
    }

    groupedEvents.get(sessionId).events.push({
      ...event,
      id: event.clrt_run_id || `${event.url}/${event.ts64}`
    })
  }

  // Process groups to determine parent/child relationships
  const structuredEvents = []
  for (const [sessionId, group] of groupedEvents.entries()) {
    if (group.events) {
      // Sort events by timestamp (earliest first)
      const sortedEvents = group.events.sort((a, b) => new Date(a.ts) - new Date(b.ts))

      // First event becomes parent, rest are children
      const parent = sortedEvents[0]
      const children = sortedEvents.slice(1)

      structuredEvents.push({
        ...parent,
        isParent: true,
        children: children
      })
    } else if (group.parent) {
      // Handle standalone events
      structuredEvents.push({
        ...group.parent,
        isParent: true,
        children: group.children
      })
    }
  }

  // Sort by latest activity in each group
  structuredEvents.sort((a, b) => {
    const aLatest = Math.max(new Date(a.ts), ...a.children.map((c) => new Date(c.ts)))
    const bLatest = Math.max(new Date(b.ts), ...b.children.map((c) => new Date(c.ts)))
    return bLatest - aLatest
  })

  // Apply pagination to structured events
  const totalCount = structuredEvents.length
  const paginatedEvents = structuredEvents.slice(offset, offset + parseInt(limit))

  return {
    rows: paginatedEvents,
    data: { total: totalCount, page: parseInt(page), limit: parseInt(limit) }
  }
})

// @shared-route
export const apiStatisticsRoute = app.get('/statistics', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const { dateFrom, dateTo, url, userId } = req.query

  let whereClause = `
    dt BETWEEN '${dateFrom || '2024-01-01'}' AND '${dateTo || new Date().toISOString().split('T')[0]}'
  `

  if (url && url.trim()) {
    if (url.startsWith('https://') || url.startsWith('event://')) {
      whereClause += ` AND startsWith(url, '${url.trim()}')`
    } else {
      whereClause += ` AND startsWith(urlPath, '${url.trim()}')`
    }
  }

  if (userId && userId.trim()) {
    const searchTerm = userId.trim()
    whereClause += ` AND (
      resolved_user_id = '${searchTerm}' OR
      COALESCE(user_first_name, '') ILIKE '%${searchTerm}%' OR
      COALESCE(user_last_name, '') ILIKE '%${searchTerm}%' OR
      COALESCE(user_email, '') ILIKE '%${searchTerm}%')`
  }

  const statsQuery = `
    SELECT 
      COUNT(*) as total_visits,
      COUNT(DISTINCT resolved_user_id) as unique_users
    FROM 
      chatium_ai.access_log
    WHERE
      ${whereClause}
  `

  return await queryAi(ctx, statsQuery)
})

// @shared-route
export const apiEventDetailsRoute = app.post('/event', async (ctx, req) => {
  const eventId = req.body.id

  let query

  // Если ID содержит ":", значит это url:ts для пустого clrt_run_id
  if (eventId.includes(':')) {
    const lastColonIndex = eventId.lastIndexOf('/')
    const url = eventId.substring(0, lastColonIndex)
    const ts64 = eventId.substring(lastColonIndex + 1)

    query = `
      SELECT *
      FROM chatium_ai.access_log
      WHERE url = '${url}' AND ts64 = '${ts64}'
      LIMIT 1
    `
  } else {
    // Обычный поиск по clrt_run_id
    query = `
      SELECT *
      FROM chatium_ai.access_log
      WHERE clrt_run_id = '${eventId}'
      LIMIT 1
    `
  }

  const response = await queryAi(ctx, query)

  if (response.rows?.length > 0) {
    return { success: true, event: response.rows[0] }
  } else {
    return { success: false, error: 'Event not found' }
  }
})
