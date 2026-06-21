// @shared-route
import { gcQueryAi } from '@gc-mcp-server/sdk'
import { queryAi } from '@traffic/sdk'
import { requireAnyUser } from '@app/auth'

/**
 * Тестовый эндпоинт для сбора всех уникальных типов событий из ClickHouse
 * GET /dev/partnership/api/discover
 * Возвращает JSON с полным списком событий из GC и Developer аккаунтов
 */
export const discoverEventsRoute = app.get('/discover', async (ctx, req) => {
  requireAnyUser(ctx)

  try {
    const result = {
      gc_events: [] as any[],
      dev_events: [] as any[],
      merged: [] as any[],
      categorized: {
        traffic: [] as string[],
        getcourse: [] as string[],
        refunnels: [] as string[],
        workspace: [] as string[],
        custom: [] as string[],
        other: [] as string[]
      },
      stats: {
        gc_total: 0,
        dev_total: 0,
        merged_total: 0,
        unique_urlPaths: 0,
        unique_actions: 0
      }
    }

    // ==================== GC ClickHouse ====================
    try {
      const gcQuery = `
        SELECT 
          CASE 
            WHEN startsWith(urlPath, 'http://') OR startsWith(urlPath, 'https://') THEN NULL
            ELSE urlPath
          END as urlPath,
          action,
          COUNT(*) as event_count
        FROM chatium_ai.access_log
        WHERE dt >= today() - 30
        GROUP BY urlPath, action
        HAVING urlPath IS NOT NULL OR action IS NOT NULL
        ORDER BY event_count DESC
      `

      const gcResult = await gcQueryAi(ctx, gcQuery)
      result.gc_events = gcResult.rows || []
      result.stats.gc_total = result.gc_events.length
    } catch (gcError) {
      result.gc_events = [{ error: gcError instanceof Error ? gcError.message : 'GC query failed' }]
    }

    // ==================== Developer Account ClickHouse ====================
    try {
      const devQuery = `
        SELECT 
          CASE 
            WHEN startsWith(urlPath, 'http://') OR startsWith(urlPath, 'https://') THEN NULL
            ELSE urlPath
          END as urlPath,
          action,
          COUNT(*) as event_count
        FROM chatium_ai.access_log
        WHERE dt >= today() - 30
        GROUP BY urlPath, action
        HAVING urlPath IS NOT NULL OR action IS NOT NULL
        ORDER BY event_count DESC
      `

      const devResult = await queryAi(ctx, devQuery)
      result.dev_events = devResult.rows || []
      result.stats.dev_total = result.dev_events.length
    } catch (devError) {
      result.dev_events = [
        { error: devError instanceof Error ? devError.message : 'Dev query failed' }
      ]
    }

    // ==================== Merge Events ====================
    const eventMap = new Map<string, any>()

    // Добавляем GC события
    for (const event of result.gc_events) {
      if (event.error) continue
      const key = `${event.urlPath || 'null'}::${event.action || 'null'}`
      if (!eventMap.has(key)) {
        eventMap.set(key, {
          urlPath: event.urlPath,
          action: event.action,
          source: 'gc',
          gc_count: event.event_count,
          dev_count: 0
        })
      }
    }

    // Добавляем Dev события
    for (const event of result.dev_events) {
      if (event.error) continue
      const key = `${event.urlPath || 'null'}::${event.action || 'null'}`
      if (eventMap.has(key)) {
        const existing = eventMap.get(key)!
        existing.source = 'both'
        existing.dev_count = event.event_count
      } else {
        eventMap.set(key, {
          urlPath: event.urlPath,
          action: event.action,
          source: 'dev',
          gc_count: 0,
          dev_count: event.event_count
        })
      }
    }

    result.merged = Array.from(eventMap.values()).sort(
      (a, b) => b.gc_count + b.dev_count - (a.gc_count + a.dev_count)
    )

    result.stats.merged_total = result.merged.length

    // Подсчет уникальных urlPath и action
    const uniqueUrlPaths = new Set(result.merged.map((e) => e.urlPath).filter(Boolean))
    const uniqueActions = new Set(result.merged.map((e) => e.action).filter(Boolean))

    result.stats.unique_urlPaths = uniqueUrlPaths.size
    result.stats.unique_actions = uniqueActions.size

    // ==================== Categorize Events ====================
    for (const event of result.merged) {
      const identifier = event.urlPath || event.action

      if (event.action && !event.urlPath) {
        // HTTP событие (traffic)
        result.categorized.traffic.push(event.action)
      } else if (event.urlPath?.startsWith('event://getcourse/')) {
        // GetCourse событие
        result.categorized.getcourse.push(event.urlPath)
      } else if (event.urlPath?.startsWith('event://refunnels/')) {
        // ReFunnels событие
        result.categorized.refunnels.push(event.urlPath)
      } else if (event.urlPath?.startsWith('event://workspace/')) {
        // Workspace событие
        result.categorized.workspace.push(event.urlPath)
      } else if (event.urlPath?.startsWith('event://custom/')) {
        // Custom событие
        result.categorized.custom.push(event.urlPath)
      } else if (identifier) {
        // Другое
        result.categorized.other.push(identifier)
      }
    }

    // Убираем дубликаты в категориях
    result.categorized.traffic = Array.from(new Set(result.categorized.traffic)).sort()
    result.categorized.getcourse = Array.from(new Set(result.categorized.getcourse)).sort()
    result.categorized.refunnels = Array.from(new Set(result.categorized.refunnels)).sort()
    result.categorized.workspace = Array.from(new Set(result.categorized.workspace)).sort()
    result.categorized.custom = Array.from(new Set(result.categorized.custom)).sort()
    result.categorized.other = Array.from(new Set(result.categorized.other)).sort()

    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

export default discoverEventsRoute
