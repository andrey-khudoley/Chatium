import { queryAi } from '@traffic/sdk'
import LandingsTable from '../tables/landings.table'

// @shared-route
export const apiGetEngagementStatsRoute = app
  .query((s) => ({
    period: s.string().optional(),
    startDate: s.string().optional(),
    endDate: s.string().optional()
  }))
  .get('/engagement-stats', async (ctx, req) => {
    try {
      let dateCondition = ''

      // Если заданы произвольные даты
      if (req.query.startDate && req.query.endDate) {
        const startDate = new Date(req.query.startDate)
        const endDate = new Date(req.query.endDate)

        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]

        dateCondition = `dt >= toDate('${startDateStr}') AND dt <= toDate('${endDateStr}')`
      } else {
        // Используем предустановленный период
        const periodParam = req.query.period || '30'

        if (periodParam === 'today') {
          dateCondition = 'dt = today()'
        } else if (periodParam === 'yesterday') {
          dateCondition = 'dt = yesterday()'
        } else {
          const period = parseInt(periodParam)
          dateCondition = `dt >= subtractDays(today(), ${period})`
        }
      }

      // Получаем активные лендинги из базы данных
      const landings = await LandingsTable.findAll(ctx, {
        where: { isActive: true },
        limit: 1000
      })

      if (landings.length === 0) {
        return { success: true, data: [] }
      }

      // Получаем статистику по каждому лендингу параллельно из behaviour2_log
      const engagementPromises = landings.map(async (landing) => {
        try {
          // Запрос для получения общего количества сессий и визитов
          const sessionsQuery = `
          SELECT 
            COUNT(DISTINCT uid) as sessions_count,
            COUNT(*) as visits_count
          FROM chatium_ai.behaviour2_log
          WHERE
            startsWith(urlPath, 'https')
            AND (urlPath LIKE '%${landing.path}%' OR urlPath LIKE '%${landing.path}/%')
            AND ${dateCondition}
        `

          // Отдельный запрос для MIN/AVG/MAX (только визиты >= 3 секунд и <= 2 часов)
          const durationQuery = `
          SELECT
            AVG(view_total_duration) as avg_duration_ms,
            MIN(view_total_duration) as min_duration_ms,
            MAX(view_total_duration) as max_duration_ms
          FROM chatium_ai.behaviour2_log
          WHERE
            startsWith(urlPath, 'https')
            AND (urlPath LIKE '%${landing.path}%' OR urlPath LIKE '%${landing.path}/%')
            AND ${dateCondition}
            AND view_total_duration >= 3000
            AND view_total_duration <= 7200000
        `

          const [sessionsResult, durationResult] = await Promise.all([
            queryAi(ctx, sessionsQuery),
            queryAi(ctx, durationQuery)
          ])

          const sessionsCount = sessionsResult.rows[0]?.sessions_count || 0
          const visitsCount = sessionsResult.rows[0]?.visits_count || 0

          // Если нет сессий или нет данных о длительности
          if (sessionsCount === 0 || durationResult.rows.length === 0) {
            return {
              path: landing.path,
              title: landing.title,
              sessions_count: sessionsCount,
              visits_count: visitsCount,
              avg_duration_seconds: 0,
              avg_duration_formatted: '0 сек',
              max_duration_seconds: 0,
              min_duration_seconds: 0
            }
          }

          const row = durationResult.rows[0]

          // Функция для форматирования времени
          const formatDuration = (ms: number, isMin: boolean = false) => {
            if (ms < 1000) {
              // Меньше секунды - показываем миллисекунды
              return { seconds: 0, formatted: `${Math.round(ms)} мс` }
            }

            const seconds = isMin ? Math.ceil(ms / 1000) : Math.round(ms / 1000)

            if (seconds >= 3600) {
              const hours = Math.floor(seconds / 3600)
              const minutes = Math.floor((seconds % 3600) / 60)
              return { seconds, formatted: `${hours}ч ${minutes}м` }
            } else if (seconds >= 60) {
              const minutes = Math.floor(seconds / 60)
              const secs = seconds % 60
              return { seconds, formatted: `${minutes}м ${secs}с` }
            } else {
              return { seconds, formatted: `${seconds} сек` }
            }
          }

          const avgDuration = formatDuration(row.avg_duration_ms || 0)
          const maxDuration = formatDuration(row.max_duration_ms || 0)
          const minDuration = formatDuration(row.min_duration_ms || 0, true) // округление вверх для минимума

          // Логируем статистику по сессиям
          ctx.account.log(`Engagement stats for ${landing.path}`, {
            level: 'info',
            json: {
              sessions_count: sessionsCount,
              avg_duration_seconds: avgDuration.seconds,
              min_duration_ms: row.min_duration_ms,
              min_duration_formatted: minDuration.formatted
            }
          })

          return {
            path: landing.path,
            title: landing.title,
            sessions_count: sessionsCount,
            visits_count: visitsCount,
            avg_duration_seconds: avgDuration.seconds,
            avg_duration_formatted: avgDuration.formatted,
            max_duration_seconds: maxDuration.seconds,
            max_duration_formatted: maxDuration.formatted,
            min_duration_seconds: minDuration.seconds,
            min_duration_formatted: minDuration.formatted
          }
        } catch (error) {
          ctx.account.log(`Error getting engagement stats for ${landing.path}`, {
            level: 'warn',
            json: { error: error.message }
          })
          return {
            path: landing.path,
            title: landing.title,
            sessions_count: 0,
            visits_count: 0,
            avg_duration_seconds: 0,
            avg_duration_formatted: '0 сек',
            max_duration_seconds: 0,
            min_duration_seconds: 0
          }
        }
      })

      const results = await Promise.all(engagementPromises)

      // Фильтруем и сортируем по среднему времени
      const data = results
        .filter((item) => item.sessions_count > 0)
        .sort((a, b) => b.avg_duration_seconds - a.avg_duration_seconds)

      ctx.account.log('Engagement stats loaded', {
        level: 'info',
        json: {
          landingsCount: data.length,
          totalSessions: data.reduce((sum, item) => sum + item.sessions_count, 0),
          avgSeconds:
            data.reduce((sum, item) => sum + item.avg_duration_seconds, 0) / (data.length || 1)
        }
      })

      return { success: true, data }
    } catch (error) {
      ctx.account.log('Error in apiGetEngagementStatsRoute', {
        level: 'error',
        json: { error: error.message, stack: error.stack }
      })
      return { success: false, error: error.message }
    }
  })

// @shared-route
export const apiGetScrollHeatmapRoute = app
  .query((s) => ({
    path: s.string(),
    period: s.string().optional(),
    startDate: s.string().optional(),
    endDate: s.string().optional()
  }))
  .get('/scroll-heatmap', async (ctx, req) => {
    try {
      const path = req.query.path

      if (!path) {
        return { success: false, error: 'Path is required' }
      }

      // Построение условия даты (такое же как в engagement-stats)
      let dateCondition = ''

      if (req.query.startDate && req.query.endDate) {
        const startDate = new Date(req.query.startDate)
        const endDate = new Date(req.query.endDate)

        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]

        dateCondition = `dt >= toDate('${startDateStr}') AND dt <= toDate('${endDateStr}')`
      } else {
        const periodParam = req.query.period || '90'

        if (periodParam === 'today') {
          dateCondition = 'dt = today()'
        } else if (periodParam === 'yesterday') {
          dateCondition = 'dt = yesterday()'
        } else {
          const period = parseInt(periodParam)
          dateCondition = `dt >= subtractDays(today(), ${period})`
        }
      }

      // Запрос к таблице behaviour2_log для получения данных скроллинга
      // Используем percentiles для разбивки пользователей по диапазонам скролла
      const query = `
      WITH percentiles AS (
        SELECT
          COUNT(DISTINCT uid) as total_users,
          quantile(0.25)(scroll_distance) as p25,
          quantile(0.50)(scroll_distance) as p50,
          quantile(0.75)(scroll_distance) as p75
        FROM chatium_ai.behaviour2_log
        WHERE
          startsWith(urlPath, 'https')
          AND (urlPath LIKE '%${path}%' OR urlPath LIKE '%${path}/%')
          AND ${dateCondition}
          AND scroll_distance > 0
      ),
      user_depths AS (
        SELECT
          uid,
          MAX(scroll_distance) as max_scroll
        FROM chatium_ai.behaviour2_log
        WHERE
          startsWith(urlPath, 'https')
          AND (urlPath LIKE '%${path}%' OR urlPath LIKE '%${path}/%')
          AND ${dateCondition}
          AND scroll_distance > 0
        GROUP BY uid
      ),
      user_ranges AS (
        SELECT
          ud.uid,
          ud.max_scroll,
          CASE
            WHEN ud.max_scroll <= p.p25 THEN '0-25%'
            WHEN ud.max_scroll <= p.p50 THEN '25-50%'
            WHEN ud.max_scroll <= p.p75 THEN '50-75%'
            ELSE '75-100%'
          END as depth_range,
          p.total_users
        FROM user_depths ud
        CROSS JOIN percentiles p
      )
      SELECT
        depth_range,
        COUNT(DISTINCT uid) as users_count,
        MAX(total_users) as total_users,
        ROUND(AVG(max_scroll)) as avg_scroll
      FROM user_ranges
      GROUP BY depth_range
      ORDER BY
        CASE depth_range
          WHEN '0-25%' THEN 1
          WHEN '25-50%' THEN 2
          WHEN '50-75%' THEN 3
          WHEN '75-100%' THEN 4
          ELSE 5
        END
    `

      const result = await queryAi(ctx, query)

      ctx.account.log('Scroll heatmap query executed from behaviour2_log', {
        level: 'info',
        json: {
          path,
          rowsFound: result.rows.length,
          sampleData: result.rows.slice(0, 2)
        }
      })

      if (result.rows.length === 0) {
        return { success: true, data: [], totalUsers: 0 }
      }

      // Общее количество пользователей
      const totalUsers = result.rows[0]?.total_users || 0

      // Создаем Map текущих результатов
      const resultMap = new Map()
      result.rows.forEach((row) => {
        resultMap.set(row.depth_range, {
          users_count: row.users_count,
          avg_scroll: row.avg_scroll || 0
        })
      })

      // Все 4 диапазона - гарантируем их наличие
      const allRanges = ['0-25%', '25-50%', '50-75%', '75-100%']
      const data = allRanges.map((range) => {
        const rowData = resultMap.get(range)
        const users_count = rowData?.users_count || 0
        return {
          depth_range: range,
          avg_depth: rowData ? Math.round(rowData.avg_scroll) : 0,
          users_count: users_count,
          percentage: totalUsers > 0 ? parseFloat(((users_count / totalUsers) * 100).toFixed(1)) : 0
        }
      })

      ctx.account.log('Scroll heatmap data', {
        level: 'info',
        json: { path, totalUsers, dataLength: data.length }
      })

      return { success: true, data, totalUsers }
    } catch (error) {
      ctx.account.log('Error in apiGetScrollHeatmapRoute', {
        level: 'error',
        json: { error: error.message, stack: error.stack }
      })
      return { success: false, error: error.message }
    }
  })

// @shared-route
export const apiGetUtmStatsRoute = app
  .query((s) => ({
    period: s.string().optional(),
    startDate: s.string().optional(),
    endDate: s.string().optional()
  }))
  .get('/utm-stats', async (ctx, req) => {
    try {
      let dateCondition = ''

      // Если заданы произвольные даты
      if (req.query.startDate && req.query.endDate) {
        const startDate = new Date(req.query.startDate)
        const endDate = new Date(req.query.endDate)

        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]

        dateCondition = `dt >= toDate('${startDateStr}') AND dt <= toDate('${endDateStr}')`
      } else {
        // Используем предустановленный период
        const periodParam = req.query.period || '90'

        if (periodParam === 'today') {
          dateCondition = 'dt = today()'
        } else if (periodParam === 'yesterday') {
          dateCondition = 'dt = yesterday()'
        } else {
          const period = parseInt(periodParam)
          dateCondition = `dt >= subtractDays(today(), ${period})`
        }
      }

      // Получаем активные лендинги для фильтрации
      const landings = await LandingsTable.findAll(ctx, {
        where: { isActive: true },
        limit: 1000
      })

      if (landings.length === 0) {
        return { success: true, data: [] }
      }

      // Получаем данные по каждому лендингу с UTM метками
      const landingDataPromises = landings.map(async (landing) => {
        const landingCondition = `(urlPath LIKE '%${landing.path}%' OR urlPath LIKE '%${landing.path}/%')`

        // Запрос для получения всех комбинаций UTM меток для этого лендинга
        const query = `
        SELECT
          extractURLParameter(url, 'utm_source') as utm_source,
          extractURLParameter(url, 'utm_medium') as utm_medium,
          extractURLParameter(url, 'utm_campaign') as utm_campaign,
          extractURLParameter(url, 'utm_term') as utm_term,
          extractURLParameter(url, 'utm_content') as utm_content,
          COUNT(*) as visits_count,
          COUNT(DISTINCT uid) as sessions_count,
          AVG(CASE WHEN view_total_duration >= 3000 AND view_total_duration <= 7200000 THEN view_total_duration ELSE NULL END) as avg_duration_ms,
          MIN(CASE WHEN view_total_duration >= 3000 AND view_total_duration <= 7200000 THEN view_total_duration ELSE NULL END) as min_duration_ms,
          MAX(CASE WHEN view_total_duration >= 3000 AND view_total_duration <= 7200000 THEN view_total_duration ELSE NULL END) as max_duration_ms
        FROM chatium_ai.behaviour2_log
        WHERE
          startsWith(urlPath, 'https')
          AND ${landingCondition}
          AND ${dateCondition}
          AND (
            extractURLParameter(url, 'utm_source') != ''
            OR extractURLParameter(url, 'utm_medium') != ''
            OR extractURLParameter(url, 'utm_campaign') != ''
          )
        GROUP BY utm_source, utm_medium, utm_campaign, utm_term, utm_content
        ORDER BY visits_count DESC
      `

        const result = await queryAi(ctx, query)

        if (result.rows.length === 0) {
          return null
        }

        // Функция для форматирования времени
        const formatDuration = (ms: number, isMin: boolean = false) => {
          if (!ms || ms < 1000) {
            return { seconds: 0, formatted: '0 сек' }
          }

          const seconds = isMin ? Math.ceil(ms / 1000) : Math.round(ms / 1000)

          if (seconds >= 3600) {
            const hours = Math.floor(seconds / 3600)
            const minutes = Math.floor((seconds % 3600) / 60)
            return { seconds, formatted: `${hours}ч ${minutes}м` }
          } else if (seconds >= 60) {
            const minutes = Math.floor(seconds / 60)
            const secs = seconds % 60
            return { seconds, formatted: `${minutes}м ${secs}с` }
          } else {
            return { seconds, formatted: `${seconds} сек` }
          }
        }

        // Строим иерархию: source -> medium -> campaign -> term -> content
        const hierarchy: any = {}

        // Массив для хранения всех данных с временем для последующей агрегации
        const allDurations: any[] = []

        for (const row of result.rows) {
          const source = row.utm_source || '(direct)'
          const medium = row.utm_medium || '(none)'
          const campaign = row.utm_campaign || '(not set)'
          const term = row.utm_term || '(not set)'
          const content = row.utm_content || '(not set)'

          const avgDuration = formatDuration(row.avg_duration_ms || 0)
          const maxDuration = formatDuration(row.max_duration_ms || 0)
          const minDuration = formatDuration(row.min_duration_ms || 0, true)

          // Сохраняем данные о времени для агрегации
          allDurations.push({
            source,
            medium,
            campaign,
            term,
            content,
            avg_ms: row.avg_duration_ms || 0,
            min_ms: row.min_duration_ms || 0,
            max_ms: row.max_duration_ms || 0,
            visits: row.visits_count
          })

          if (!hierarchy[source]) {
            hierarchy[source] = {
              label: source,
              visits_count: 0,
              sessions_count: 0,
              children: {},
              durations: [] // для расчета агрегированного времени
            }
          }
          hierarchy[source].visits_count += row.visits_count
          hierarchy[source].sessions_count += row.sessions_count
          hierarchy[source].durations.push({
            avg_ms: row.avg_duration_ms,
            min_ms: row.min_duration_ms,
            max_ms: row.max_duration_ms
          })

          if (!hierarchy[source].children[medium]) {
            hierarchy[source].children[medium] = {
              label: medium,
              visits_count: 0,
              sessions_count: 0,
              children: {},
              durations: []
            }
          }
          hierarchy[source].children[medium].visits_count += row.visits_count
          hierarchy[source].children[medium].sessions_count += row.sessions_count
          hierarchy[source].children[medium].durations.push({
            avg_ms: row.avg_duration_ms,
            min_ms: row.min_duration_ms,
            max_ms: row.max_duration_ms
          })

          if (!hierarchy[source].children[medium].children[campaign]) {
            hierarchy[source].children[medium].children[campaign] = {
              label: campaign,
              visits_count: 0,
              sessions_count: 0,
              children: {},
              durations: []
            }
          }
          hierarchy[source].children[medium].children[campaign].visits_count += row.visits_count
          hierarchy[source].children[medium].children[campaign].sessions_count += row.sessions_count
          hierarchy[source].children[medium].children[campaign].durations.push({
            avg_ms: row.avg_duration_ms,
            min_ms: row.min_duration_ms,
            max_ms: row.max_duration_ms
          })

          if (!hierarchy[source].children[medium].children[campaign].children[term]) {
            hierarchy[source].children[medium].children[campaign].children[term] = {
              label: term,
              visits_count: 0,
              sessions_count: 0,
              children: {},
              durations: []
            }
          }
          hierarchy[source].children[medium].children[campaign].children[term].visits_count +=
            row.visits_count
          hierarchy[source].children[medium].children[campaign].children[term].sessions_count +=
            row.sessions_count
          hierarchy[source].children[medium].children[campaign].children[term].durations.push({
            avg_ms: row.avg_duration_ms,
            min_ms: row.min_duration_ms,
            max_ms: row.max_duration_ms
          })

          hierarchy[source].children[medium].children[campaign].children[term].children[content] = {
            label: content,
            visits_count: row.visits_count,
            sessions_count: row.sessions_count,
            avg_duration_formatted: avgDuration.formatted,
            min_duration_formatted: minDuration.formatted,
            max_duration_formatted: maxDuration.formatted
          }
        }

        // Функция для расчета агрегированного времени для узла
        const calculateAggregatedDuration = (durations: any[]) => {
          const validDurations = durations.filter((d) => d.avg_ms > 0)
          if (validDurations.length === 0) {
            return {
              avg_duration_formatted: '0 сек',
              min_duration_formatted: '0 сек',
              max_duration_formatted: '0 сек'
            }
          }

          const avgMs =
            validDurations.reduce((sum, d) => sum + (d.avg_ms || 0), 0) / validDurations.length
          const minMs = Math.min(
            ...validDurations
              .map((d) => d.min_ms || Infinity)
              .filter((v) => v !== Infinity && v > 0)
          )
          const maxMs = Math.max(...validDurations.map((d) => d.max_ms || 0))

          return {
            avg_duration_formatted: formatDuration(avgMs).formatted,
            min_duration_formatted: formatDuration(minMs, true).formatted,
            max_duration_formatted: formatDuration(maxMs).formatted
          }
        }

        // Рассчитываем агрегированное время для каждого уровня
        for (const source in hierarchy) {
          const sourceNode = hierarchy[source]
          const sourceDurations = calculateAggregatedDuration(sourceNode.durations)
          sourceNode.avg_duration_formatted = sourceDurations.avg_duration_formatted
          sourceNode.min_duration_formatted = sourceDurations.min_duration_formatted
          sourceNode.max_duration_formatted = sourceDurations.max_duration_formatted
          delete sourceNode.durations // удаляем временный массив

          for (const medium in sourceNode.children) {
            const mediumNode = sourceNode.children[medium]
            const mediumDurations = calculateAggregatedDuration(mediumNode.durations)
            mediumNode.avg_duration_formatted = mediumDurations.avg_duration_formatted
            mediumNode.min_duration_formatted = mediumDurations.min_duration_formatted
            mediumNode.max_duration_formatted = mediumDurations.max_duration_formatted
            delete mediumNode.durations

            for (const campaign in mediumNode.children) {
              const campaignNode = mediumNode.children[campaign]
              const campaignDurations = calculateAggregatedDuration(campaignNode.durations)
              campaignNode.avg_duration_formatted = campaignDurations.avg_duration_formatted
              campaignNode.min_duration_formatted = campaignDurations.min_duration_formatted
              campaignNode.max_duration_formatted = campaignDurations.max_duration_formatted
              delete campaignNode.durations

              for (const term in campaignNode.children) {
                const termNode = campaignNode.children[term]
                const termDurations = calculateAggregatedDuration(termNode.durations)
                termNode.avg_duration_formatted = termDurations.avg_duration_formatted
                termNode.min_duration_formatted = termDurations.min_duration_formatted
                termNode.max_duration_formatted = termDurations.max_duration_formatted
                delete termNode.durations
              }
            }
          }
        }

        return {
          path: landing.path,
          title: landing.title,
          hierarchy
        }
      })

      const results = await Promise.all(landingDataPromises)
      const data = results.filter((item) => item !== null)

      ctx.account.log('UTM stats loaded with hierarchy', {
        level: 'info',
        json: {
          landingsWithUtm: data.length
        }
      })

      return { success: true, data }
    } catch (error) {
      ctx.account.log('Error in apiGetUtmStatsRoute', {
        level: 'error',
        json: { error: error.message, stack: error.stack }
      })
      return { success: false, error: error.message }
    }
  })
