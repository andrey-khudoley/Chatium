import { queryAi } from '@traffic/sdk'
import { requireRealUser } from '@app/auth'
import LandingsTable from '../tables/landings.table'
import { loadWorkspaceData, parseDate } from '../shared/workspace-data-loader'

// @shared-route
export const apiGetEngagementStatsRoute = app
  .query((s) => ({
    period: s.string().optional(),
    startDate: s.string().optional(),
    endDate: s.string().optional(),
    landingPath: s.string().optional()
  }))
  .get('/engagement-stats', async (ctx, req) => {
    requireRealUser(ctx)
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
      let landings
      if (req.query.landingPath) {
        // Фильтруем по конкретному лендингу
        landings = await LandingsTable.findAll(ctx, {
          where: { path: req.query.landingPath, isActive: true },
          limit: 1
        })
      } else {
        // Загружаем все активные
        landings = await LandingsTable.findAll(ctx, {
          where: { isActive: true },
          limit: 1000
        })
      }

      if (landings.length === 0) {
        return { success: true, data: [] }
      }

      // Получаем статистику по каждому лендингу параллельно из behaviour2_log
      const engagementPromises = landings.map(async (landing) => {
        // Определяем границы периода
        let periodStart: Date
        let periodEnd: Date

        if (req.query.startDate && req.query.endDate) {
          periodStart = new Date(req.query.startDate)
          periodEnd = new Date(req.query.endDate)
        } else {
          const periodParam = req.query.period || '30'
          periodEnd = new Date()
          periodEnd.setHours(23, 59, 59, 999)

          if (periodParam === 'today') {
            periodStart = new Date()
            periodStart.setHours(0, 0, 0, 0)
          } else if (periodParam === 'yesterday') {
            periodStart = new Date()
            periodStart.setDate(periodStart.getDate() - 1)
            periodStart.setHours(0, 0, 0, 0)
            periodEnd = new Date()
            periodEnd.setHours(0, 0, 0, 0)
          } else {
            const period = parseInt(periodParam)
            periodStart = new Date()
            periodStart.setDate(periodStart.getDate() - period)
            periodStart.setHours(0, 0, 0, 0)
          }
        }

        // Загружаем все данные из воркспейса лендинга
        const workspaceData = await loadWorkspaceData(
          ctx,
          landing.workspacePath || '',
          periodStart,
          periodEnd
        )

        const registrationsCount = workspaceData.registrations.length
        const ordersCount = workspaceData.orders.length
        const paymentsCount = workspaceData.payments.length
        const totalPaymentsAmount = workspaceData.totalPaymentsAmount

        try {
          // Запрос для получения общего количества сессий, визитов и кликов
          const sessionsQuery = `
          SELECT 
            COUNT(DISTINCT uid) as sessions_count,
            COUNT(*) as visits_count,
            SUM(click_counter) as clicks_count
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

          // Количество регистраций уже посчитано выше

          const [sessionsResult, durationResult] = await Promise.all([
            queryAi(ctx, sessionsQuery),
            queryAi(ctx, durationQuery)
          ])

          const sessionsCount = sessionsResult.rows[0]?.sessions_count || 0
          const visitsCount = sessionsResult.rows[0]?.visits_count || 0
          const clicksCount = sessionsResult.rows[0]?.clicks_count || 0

          // Если нет сессий или нет данных о длительности
          if (sessionsCount === 0 || durationResult.rows.length === 0) {
            return {
              path: landing.path,
              title: landing.title,
              sessions_count: sessionsCount,
              visits_count: visitsCount,
              clicks_count: clicksCount,
              registrations_count: registrationsCount,
              conversion_rate: 0,
              orders_count: ordersCount,
              payments_count: paymentsCount,
              total_payments_amount: totalPaymentsAmount,
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

          // Рассчитываем конверсию
          const conversionRate =
            sessionsCount > 0 ? ((registrationsCount / sessionsCount) * 100).toFixed(2) : '0.00'

          return {
            path: landing.path,
            title: landing.title,
            sessions_count: sessionsCount,
            visits_count: visitsCount,
            clicks_count: clicksCount,
            registrations_count: registrationsCount,
            conversion_rate: parseFloat(conversionRate),
            orders_count: ordersCount,
            payments_count: paymentsCount,
            total_payments_amount: totalPaymentsAmount,
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
            clicks_count: 0,
            registrations_count: 0,
            conversion_rate: 0,
            orders_count: 0,
            payments_count: 0,
            total_payments_amount: 0,
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
    requireRealUser(ctx)
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
    endDate: s.string().optional(),
    landingPath: s.string().optional()
  }))
  .get('/utm-stats', async (ctx, req) => {
    requireRealUser(ctx)
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
      let landings
      if (req.query.landingPath) {
        // Фильтруем по конкретному лендингу
        landings = await LandingsTable.findAll(ctx, {
          where: { path: req.query.landingPath, isActive: true },
          limit: 1
        })
      } else {
        // Загружаем все активные
        landings = await LandingsTable.findAll(ctx, {
          where: { isActive: true },
          limit: 1000
        })
      }

      if (landings.length === 0) {
        return { success: true, data: [] }
      }

      // Получаем данные по каждому лендингу с UTM метками
      const landingDataPromises = landings.map(async (landing) => {
        // Определяем границы периода
        let periodStartUtm: Date
        let periodEndUtm: Date

        if (req.query.startDate && req.query.endDate) {
          periodStartUtm = new Date(req.query.startDate)
          periodEndUtm = new Date(req.query.endDate)
        } else {
          const periodParam = req.query.period || '90'
          periodEndUtm = new Date()
          periodEndUtm.setHours(23, 59, 59, 999)

          if (periodParam === 'today') {
            periodStartUtm = new Date()
            periodStartUtm.setHours(0, 0, 0, 0)
          } else if (periodParam === 'yesterday') {
            periodStartUtm = new Date()
            periodStartUtm.setDate(periodStartUtm.getDate() - 1)
            periodStartUtm.setHours(0, 0, 0, 0)
            periodEndUtm = new Date()
            periodEndUtm.setHours(0, 0, 0, 0)
          } else {
            const period = parseInt(periodParam)
            periodStartUtm = new Date()
            periodStartUtm.setDate(periodStartUtm.getDate() - period)
            periodStartUtm.setHours(0, 0, 0, 0)
          }
        }

        // Загружаем регистрации из воркспейса лендинга
        const workspaceDataForUtm = await loadWorkspaceData(
          ctx,
          landing.workspacePath || '',
          periodStartUtm,
          periodEndUtm
        )
        const registrations = workspaceDataForUtm.registrations

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

        // Создаем Map для подсчета конверсий по UTM меткам
        const conversionsMap = new Map<string, number>()

        for (const reg of registrations) {
          const source = reg.utm_source || '(direct)'
          const medium = reg.utm_medium || '(none)'
          const campaign = reg.utm_campaign || '(not set)'
          const term = reg.utm_term || '(not set)'
          const content = reg.utm_content || '(not set)'

          const key = `${source}|${medium}|${campaign}|${term}|${content}`
          conversionsMap.set(key, (conversionsMap.get(key) || 0) + 1)
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

          // Получаем количество конверсий для этой комбинации UTM меток
          const utmKey = `${source}|${medium}|${campaign}|${term}|${content}`
          const conversionsCount = conversionsMap.get(utmKey) || 0
          const conversionRate =
            row.sessions_count > 0
              ? ((conversionsCount / row.sessions_count) * 100).toFixed(2)
              : '0.00'

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
              conversions_count: 0,
              children: {},
              durations: [] // для расчета агрегированного времени
            }
          }
          hierarchy[source].visits_count += row.visits_count
          hierarchy[source].sessions_count += row.sessions_count
          hierarchy[source].conversions_count += conversionsCount
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
              conversions_count: 0,
              children: {},
              durations: []
            }
          }
          hierarchy[source].children[medium].visits_count += row.visits_count
          hierarchy[source].children[medium].sessions_count += row.sessions_count
          hierarchy[source].children[medium].conversions_count += conversionsCount
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
              conversions_count: 0,
              children: {},
              durations: []
            }
          }
          hierarchy[source].children[medium].children[campaign].visits_count += row.visits_count
          hierarchy[source].children[medium].children[campaign].sessions_count += row.sessions_count
          hierarchy[source].children[medium].children[campaign].conversions_count +=
            conversionsCount
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
              conversions_count: 0,
              children: {},
              durations: []
            }
          }
          hierarchy[source].children[medium].children[campaign].children[term].visits_count +=
            row.visits_count
          hierarchy[source].children[medium].children[campaign].children[term].sessions_count +=
            row.sessions_count
          hierarchy[source].children[medium].children[campaign].children[term].conversions_count +=
            conversionsCount
          hierarchy[source].children[medium].children[campaign].children[term].durations.push({
            avg_ms: row.avg_duration_ms,
            min_ms: row.min_duration_ms,
            max_ms: row.max_duration_ms
          })

          hierarchy[source].children[medium].children[campaign].children[term].children[content] = {
            label: content,
            visits_count: row.visits_count,
            sessions_count: row.sessions_count,
            conversions_count: conversionsCount,
            conversion_rate: parseFloat(conversionRate),
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
          sourceNode.conversion_rate =
            sourceNode.sessions_count > 0
              ? parseFloat(
                  ((sourceNode.conversions_count / sourceNode.sessions_count) * 100).toFixed(2)
                )
              : 0
          delete sourceNode.durations // удаляем временный массив

          for (const medium in sourceNode.children) {
            const mediumNode = sourceNode.children[medium]
            const mediumDurations = calculateAggregatedDuration(mediumNode.durations)
            mediumNode.avg_duration_formatted = mediumDurations.avg_duration_formatted
            mediumNode.min_duration_formatted = mediumDurations.min_duration_formatted
            mediumNode.max_duration_formatted = mediumDurations.max_duration_formatted
            mediumNode.conversion_rate =
              mediumNode.sessions_count > 0
                ? parseFloat(
                    ((mediumNode.conversions_count / mediumNode.sessions_count) * 100).toFixed(2)
                  )
                : 0
            delete mediumNode.durations

            for (const campaign in mediumNode.children) {
              const campaignNode = mediumNode.children[campaign]
              const campaignDurations = calculateAggregatedDuration(campaignNode.durations)
              campaignNode.avg_duration_formatted = campaignDurations.avg_duration_formatted
              campaignNode.min_duration_formatted = campaignDurations.min_duration_formatted
              campaignNode.max_duration_formatted = campaignDurations.max_duration_formatted
              campaignNode.conversion_rate =
                campaignNode.sessions_count > 0
                  ? parseFloat(
                      (
                        (campaignNode.conversions_count / campaignNode.sessions_count) *
                        100
                      ).toFixed(2)
                    )
                  : 0
              delete campaignNode.durations

              for (const term in campaignNode.children) {
                const termNode = campaignNode.children[term]
                const termDurations = calculateAggregatedDuration(termNode.durations)
                termNode.avg_duration_formatted = termDurations.avg_duration_formatted
                termNode.min_duration_formatted = termDurations.min_duration_formatted
                termNode.max_duration_formatted = termDurations.max_duration_formatted
                termNode.conversion_rate =
                  termNode.sessions_count > 0
                    ? parseFloat(
                        ((termNode.conversions_count / termNode.sessions_count) * 100).toFixed(2)
                      )
                    : 0
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

// @shared-route
export const apiGetDateStatsRoute = app
  .query((s) => ({
    period: s.string().optional(),
    startDate: s.string().optional(),
    endDate: s.string().optional(),
    landingPath: s.string().optional()
  }))
  .get('/date-stats', async (ctx, req) => {
    requireRealUser(ctx)
    try {
      let dateCondition = ''
      let periodStart: Date
      let periodEnd: Date

      // Если заданы произвольные даты
      if (req.query.startDate && req.query.endDate) {
        const startDate = new Date(req.query.startDate)
        const endDate = new Date(req.query.endDate)

        periodStart = startDate
        periodEnd = endDate

        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]

        dateCondition = `dt >= toDate('${startDateStr}') AND dt <= toDate('${endDateStr}')`
      } else {
        // Используем предустановленный период
        const periodParam = req.query.period || '90'

        if (periodParam === 'today') {
          dateCondition = 'dt = today()'
          periodStart = new Date()
          periodStart.setHours(0, 0, 0, 0)
          periodEnd = new Date()
          periodEnd.setHours(23, 59, 59, 999)
        } else if (periodParam === 'yesterday') {
          dateCondition = 'dt = yesterday()'
          periodStart = new Date()
          periodStart.setDate(periodStart.getDate() - 1)
          periodStart.setHours(0, 0, 0, 0)
          periodEnd = new Date()
          periodEnd.setHours(0, 0, 0, 0)
        } else {
          const period = parseInt(periodParam)
          dateCondition = `dt >= subtractDays(today(), ${period})`
          periodEnd = new Date()
          periodEnd.setHours(23, 59, 59, 999)
          periodStart = new Date()
          periodStart.setDate(periodStart.getDate() - period)
          periodStart.setHours(0, 0, 0, 0)
        }
      }

      // Получаем активные лендинги
      let landings
      if (req.query.landingPath) {
        // Фильтруем по конкретному лендингу
        landings = await LandingsTable.findAll(ctx, {
          where: { path: req.query.landingPath, isActive: true },
          limit: 1
        })
      } else {
        // Загружаем все активные
        landings = await LandingsTable.findAll(ctx, {
          where: { isActive: true },
          limit: 1000
        })
      }

      if (landings.length === 0) {
        return { success: true, data: [] }
      }

      // Массив для сбора всех данных по датам
      const allDateData = []

      // Получаем данные по датам для всех лендингов
      const dateDataPromises = landings.map(async (landing) => {
        // Загружаем регистрации из воркспейса лендинга
        const workspaceDataForDate = await loadWorkspaceData(
          ctx,
          landing.workspacePath || '',
          periodStart,
          periodEnd
        )
        const registrations = workspaceDataForDate.registrations

        // Создаем Map регистраций по дате (YYYY-MM-DD)
        const regsByDate = new Map<string, number>()
        for (const reg of registrations) {
          const regDate = parseDate(reg.createdAt || reg.date_reg)
          if (!regDate) continue
          const dateKey = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, '0')}-${String(regDate.getDate()).padStart(2, '0')}`
          regsByDate.set(dateKey, (regsByDate.get(dateKey) || 0) + 1)
        }

        const landingCondition = `(urlPath LIKE '%${landing.path}%' OR urlPath LIKE '%${landing.path}/%')`

        // Запрос для получения данных по датам
        const query = `
        SELECT
          dt,
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
        GROUP BY dt
        ORDER BY dt ASC
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

        // Добавляем данные этого лендинга к общему результату
        for (const row of result.rows) {
          const date = new Date(row.dt)
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          const day = date.getDate()

          const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const conversionsCount = regsByDate.get(dateKey) || 0

          allDateData.push({
            year,
            month,
            day,
            dateKey,
            visits_count: row.visits_count,
            sessions_count: row.sessions_count,
            conversions_count: conversionsCount,
            avg_ms: row.avg_duration_ms,
            min_ms: row.min_duration_ms,
            max_ms: row.max_duration_ms
          })
        }

        // Функция для расчета агрегированного времени
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

        // Не возвращаем ничего, данные уже добавлены в allDateData
        return null
      })

      await Promise.all(dateDataPromises)

      // Теперь агрегируем allDateData в единую иерархию
      const hierarchy: any = {}

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

      // Группируем по датам (агрегация по всем лендингам)
      const dateGroups = new Map()

      for (const item of allDateData) {
        const key = item.dateKey
        if (!dateGroups.has(key)) {
          dateGroups.set(key, {
            year: item.year,
            month: item.month,
            day: item.day,
            dateKey: item.dateKey,
            visits_count: 0,
            sessions_count: 0,
            conversions_count: 0,
            durations: []
          })
        }

        const group = dateGroups.get(key)
        group.visits_count += item.visits_count
        group.sessions_count += item.sessions_count
        group.conversions_count += item.conversions_count
        group.durations.push({
          avg_ms: item.avg_ms,
          min_ms: item.min_ms,
          max_ms: item.max_ms
        })
      }

      // Строим иерархию год → месяц → день
      for (const [dateKey, data] of dateGroups) {
        const { year, month, day, visits_count, sessions_count, conversions_count, durations } =
          data

        // Инициализация года
        if (!hierarchy[year]) {
          hierarchy[year] = {
            label: `${year}`,
            visits_count: 0,
            sessions_count: 0,
            conversions_count: 0,
            children: {},
            durations: []
          }
        }
        hierarchy[year].visits_count += visits_count
        hierarchy[year].sessions_count += sessions_count
        hierarchy[year].conversions_count += conversions_count
        hierarchy[year].durations.push(...durations)

        // Инициализация месяца
        const monthNames = [
          'Январь',
          'Февраль',
          'Март',
          'Апрель',
          'Май',
          'Июнь',
          'Июль',
          'Август',
          'Сентябрь',
          'Октябрь',
          'Ноябрь',
          'Декабрь'
        ]
        const monthKey = String(month).padStart(2, '0')
        const monthLabel = monthNames[month - 1]

        if (!hierarchy[year].children[monthKey]) {
          hierarchy[year].children[monthKey] = {
            label: monthLabel,
            visits_count: 0,
            sessions_count: 0,
            conversions_count: 0,
            children: {},
            durations: []
          }
        }
        hierarchy[year].children[monthKey].visits_count += visits_count
        hierarchy[year].children[monthKey].sessions_count += sessions_count
        hierarchy[year].children[monthKey].conversions_count += conversions_count
        hierarchy[year].children[monthKey].durations.push(...durations)

        // Добавление дня
        const dayKey = String(day).padStart(2, '0')
        const dayLabel = `${day} ${monthLabel.toLowerCase()}`

        const conversionRate = sessions_count > 0 ? (conversions_count / sessions_count) * 100 : 0

        // Функция для расчета агрегированного времени
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

        const dayDurations = calculateAggregatedDuration(durations)

        hierarchy[year].children[monthKey].children[dayKey] = {
          label: dayLabel,
          date: dateKey,
          visits_count: visits_count,
          sessions_count: sessions_count,
          conversions_count: conversions_count,
          conversion_rate: conversionRate,
          avg_duration_formatted: dayDurations.avg_duration_formatted,
          min_duration_formatted: dayDurations.min_duration_formatted,
          max_duration_formatted: dayDurations.max_duration_formatted
        }
      }

      // Функция для расчета агрегированного времени
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
          ...validDurations.map((d) => d.min_ms || Infinity).filter((v) => v !== Infinity && v > 0)
        )
        const maxMs = Math.max(...validDurations.map((d) => d.max_ms || 0))
        return {
          avg_duration_formatted: formatDuration(avgMs).formatted,
          min_duration_formatted: formatDuration(minMs, true).formatted,
          max_duration_formatted: formatDuration(maxMs).formatted
        }
      }

      // Агрегируем время для года и месяца
      for (const year in hierarchy) {
        const yearNode = hierarchy[year]
        const yearDurations = calculateAggregatedDuration(yearNode.durations)
        yearNode.avg_duration_formatted = yearDurations.avg_duration_formatted
        yearNode.min_duration_formatted = yearDurations.min_duration_formatted
        yearNode.max_duration_formatted = yearDurations.max_duration_formatted
        yearNode.conversion_rate =
          yearNode.sessions_count > 0
            ? (yearNode.conversions_count / yearNode.sessions_count) * 100
            : 0
        delete yearNode.durations

        for (const monthKey in yearNode.children) {
          const monthNode = yearNode.children[monthKey]
          const monthDurations = calculateAggregatedDuration(monthNode.durations)
          monthNode.avg_duration_formatted = monthDurations.avg_duration_formatted
          monthNode.min_duration_formatted = monthDurations.min_duration_formatted
          monthNode.max_duration_formatted = monthDurations.max_duration_formatted
          monthNode.conversion_rate =
            monthNode.sessions_count > 0
              ? (monthNode.conversions_count / monthNode.sessions_count) * 100
              : 0
          delete monthNode.durations
        }
      }

      ctx.account.log('Date stats loaded with hierarchy', {
        level: 'info',
        json: {
          totalDates: allDateData.length,
          yearsCount: Object.keys(hierarchy).length
        }
      })

      return { success: true, hierarchy }
    } catch (error) {
      ctx.account.log('Error in apiGetDateStatsRoute', {
        level: 'error',
        json: { error: error.message, stack: error.stack }
      })
      return { success: false, error: error.message }
    }
  })

// @shared-route
export const apiGetRegistrationsByDayRoute = app
  .query((s) => ({
    period: s.string().optional(),
    startDate: s.string().optional(),
    endDate: s.string().optional(),
    landingPath: s.string().optional()
  }))
  .get('/registrations-by-day', async (ctx, req) => {
    requireRealUser(ctx)
    try {
      // Определяем границы периода
      let periodStart: Date
      let periodEnd: Date

      if (req.query.startDate && req.query.endDate) {
        periodStart = new Date(req.query.startDate)
        periodEnd = new Date(req.query.endDate)
      } else {
        const periodParam = req.query.period || '90'
        periodEnd = new Date()
        periodEnd.setHours(23, 59, 59, 999)

        if (periodParam === 'today') {
          periodStart = new Date()
          periodStart.setHours(0, 0, 0, 0)
        } else if (periodParam === 'yesterday') {
          periodStart = new Date()
          periodStart.setDate(periodStart.getDate() - 1)
          periodStart.setHours(0, 0, 0, 0)
          periodEnd = new Date()
          periodEnd.setHours(0, 0, 0, 0)
        } else {
          const period = parseInt(periodParam)
          periodStart = new Date()
          periodStart.setDate(periodStart.getDate() - period)
          periodStart.setHours(0, 0, 0, 0)
        }
      }

      // Получаем активные лендинги или конкретный лендинг
      let landings
      if (req.query.landingPath) {
        landings = await LandingsTable.findAll(ctx, {
          where: { path: req.query.landingPath, isActive: true },
          limit: 1
        })
      } else {
        landings = await LandingsTable.findAll(ctx, {
          where: { isActive: true },
          limit: 1000
        })
      }

      if (landings.length === 0) {
        return { success: true, data: [] }
      }

      // Собираем все регистрации
      const allRegistrations = []

      for (const landing of landings) {
        // Загружаем регистрации из воркспейса лендинга
        const workspaceDataForReg = await loadWorkspaceData(
          ctx,
          landing.workspacePath || '',
          periodStart,
          periodEnd
        )
        allRegistrations.push(...workspaceDataForReg.registrations)
      }

      // Группируем по дням
      const regsByDay = new Map<string, number>()

      for (const reg of allRegistrations) {
        const regDate = parseDate(reg.createdAt || reg.date_reg)
        if (!regDate) continue
        if (!regDate) continue
        if (regDate < periodStart || regDate > periodEnd) continue

        const dateKey = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, '0')}-${String(regDate.getDate()).padStart(2, '0')}`
        regsByDay.set(dateKey, (regsByDay.get(dateKey) || 0) + 1)
      }

      // Преобразуем в массив и сортируем
      const data = Array.from(regsByDay.entries())
        .map(([date, count]) => ({ date, registrations: count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return { success: true, data }
    } catch (error) {
      ctx.account.log('Error in apiGetRegistrationsByDayRoute', {
        level: 'error',
        json: { error: error.message, stack: error.stack }
      })
      return { success: false, error: error.message }
    }
  })

// @shared-route
export const apiGetDemographicsRoute = app
  .query((s) => ({
    period: s.string().optional(),
    startDate: s.string().optional(),
    endDate: s.string().optional(),
    landingPath: s.string().optional()
  }))
  .get('/demographics', async (ctx, req) => {
    requireRealUser(ctx)
    try {
      // Определяем условие даты
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

      // Получаем активные лендинги
      let landings
      if (req.query.landingPath) {
        landings = await LandingsTable.findAll(ctx, {
          where: { path: req.query.landingPath, isActive: true },
          limit: 1
        })
      } else {
        landings = await LandingsTable.findAll(ctx, {
          where: { isActive: true },
          limit: 1000
        })
      }

      if (landings.length === 0) {
        return { success: true, regions: [], cities: [] }
      }

      // Собираем данные по регионам и городам для всех лендингов
      const regionsMap = new Map()
      const citiesMap = new Map()

      for (const landing of landings) {
        const landingCondition = `(urlPath LIKE '%${landing.path}%' OR urlPath LIKE '%${landing.path}/%')`

        // Запрос для регионов из access_log
        const regionsQuery = `
        SELECT
          location_region,
          COUNT(DISTINCT uid) as sessions_count
        FROM chatium_ai.access_log
        WHERE
          startsWith(urlPath, 'https')
          AND ${landingCondition}
          AND ${dateCondition}
          AND location_region != ''
        GROUP BY location_region
        ORDER BY sessions_count DESC
        LIMIT 20
      `

        // Запрос для городов из access_log
        const citiesQuery = `
        SELECT
          location_city,
          COUNT(DISTINCT uid) as sessions_count
        FROM chatium_ai.access_log
        WHERE
          startsWith(urlPath, 'https')
          AND ${landingCondition}
          AND ${dateCondition}
          AND location_city != ''
        GROUP BY location_city
        ORDER BY sessions_count DESC
        LIMIT 20
      `

        const [regionsResult, citiesResult] = await Promise.all([
          queryAi(ctx, regionsQuery),
          queryAi(ctx, citiesQuery)
        ])

        // Агрегируем регионы
        for (const row of regionsResult.rows) {
          const region = row.location_region || 'Не указан'
          const count = regionsMap.get(region) || 0
          regionsMap.set(region, count + row.sessions_count)
        }

        // Агрегируем города
        for (const row of citiesResult.rows) {
          const city = row.location_city || 'Не указан'
          const count = citiesMap.get(city) || 0
          citiesMap.set(city, count + row.sessions_count)
        }
      }

      // Преобразуем в массивы и сортируем
      const regionsArray = Array.from(regionsMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Топ 10 регионов

      const citiesArray = Array.from(citiesMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Топ 10 городов

      // Рассчитываем проценты
      const totalRegions = regionsArray.reduce((sum, item) => sum + item.count, 0)
      const totalCities = citiesArray.reduce((sum, item) => sum + item.count, 0)

      const regions = regionsArray.map((item) => ({
        name: item.name,
        count: item.count,
        percentage: totalRegions > 0 ? ((item.count / totalRegions) * 100).toFixed(1) : 0
      }))

      const cities = citiesArray.map((item) => ({
        name: item.name,
        count: item.count,
        percentage: totalCities > 0 ? ((item.count / totalCities) * 100).toFixed(1) : 0
      }))

      ctx.account.log('Demographics loaded from access_log', {
        level: 'info',
        json: {
          regionsCount: regions.length,
          citiesCount: cities.length,
          totalRegions,
          totalCities
        }
      })

      return { success: true, regions, cities }
    } catch (error) {
      ctx.account.log('Error in apiGetDemographicsRoute', {
        level: 'error',
        json: { error: error.message, stack: error.stack }
      })
      return { success: false, error: error.message }
    }
  })

// @shared-route
export const apiGetDevicesRoute = app
  .query((s) => ({
    period: s.string().optional(),
    startDate: s.string().optional(),
    endDate: s.string().optional(),
    landingPath: s.string().optional()
  }))
  .get('/devices', async (ctx, req) => {
    requireRealUser(ctx)
    try {
      // Определяем условие даты
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

      // Получаем активные лендинги
      let landings
      if (req.query.landingPath) {
        landings = await LandingsTable.findAll(ctx, {
          where: { path: req.query.landingPath, isActive: true },
          limit: 1
        })
      } else {
        landings = await LandingsTable.findAll(ctx, {
          where: { isActive: true },
          limit: 1000
        })
      }

      if (landings.length === 0) {
        return { success: true, deviceTypes: [], deviceBrands: [] }
      }

      // Собираем данные по типам и брендам устройств для всех лендингов
      const deviceTypesMap = new Map()
      const deviceBrandsMap = new Map()

      for (const landing of landings) {
        const landingCondition = `(urlPath LIKE '%${landing.path}%' OR urlPath LIKE '%${landing.path}/%')`

        // Запрос для определения типа устройства по OS из access_log
        const deviceTypesQuery = `
        SELECT
          CASE
            WHEN os_name IN ('Windows', 'Mac', 'GNU/Linux', 'Linux') THEN 'desktop'
            WHEN os_name = 'iOS' AND device_name LIKE '%iPad%' THEN 'tablet'
            WHEN os_name = 'Android' AND (device_name LIKE '%Tab%' OR device_name LIKE '%tablet%') THEN 'tablet'
            WHEN os_name IN ('iOS', 'Android') THEN 'mobile'
            ELSE 'desktop'
          END as device_type,
          COUNT(DISTINCT uid) as sessions_count
        FROM chatium_ai.access_log
        WHERE
          startsWith(urlPath, 'https')
          AND ${landingCondition}
          AND ${dateCondition}
          AND os_name != ''
        GROUP BY device_type
        ORDER BY sessions_count DESC
      `

        // Запрос для брендов устройств из access_log
        const deviceBrandsQuery = `
        SELECT
          CASE
            WHEN os_name = 'Windows' THEN 'Microsoft'
            WHEN os_name IN ('Mac', 'iOS') THEN 'Apple'
            WHEN ua_device_brand != '' THEN ua_device_brand
            WHEN os_name = 'Android' THEN 'Android Device'
            WHEN os_name = 'GNU/Linux' THEN 'Linux'
            ELSE 'Другое'
          END as device_brand,
          COUNT(DISTINCT uid) as sessions_count
        FROM chatium_ai.access_log
        WHERE
          startsWith(urlPath, 'https')
          AND ${landingCondition}
          AND ${dateCondition}
        GROUP BY device_brand
        ORDER BY sessions_count DESC
        LIMIT 10
      `

        const [deviceTypesResult, deviceBrandsResult] = await Promise.all([
          queryAi(ctx, deviceTypesQuery),
          queryAi(ctx, deviceBrandsQuery)
        ])

        // Агрегируем типы устройств
        for (const row of deviceTypesResult.rows) {
          const deviceType = row.device_type || 'desktop'
          const count = deviceTypesMap.get(deviceType) || 0
          deviceTypesMap.set(deviceType, count + row.sessions_count)
        }

        // Агрегируем бренды устройств
        for (const row of deviceBrandsResult.rows) {
          const deviceBrand = row.device_brand || 'Другое'
          const count = deviceBrandsMap.get(deviceBrand) || 0
          deviceBrandsMap.set(deviceBrand, count + row.sessions_count)
        }
      }

      // Преобразуем в массивы и сортируем
      const deviceTypesArray = Array.from(deviceTypesMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Топ 10 типов

      const deviceBrandsArray = Array.from(deviceBrandsMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Топ 10 брендов

      // Рассчитываем проценты
      const totalDeviceTypes = deviceTypesArray.reduce((sum, item) => sum + item.count, 0)
      const totalDeviceBrands = deviceBrandsArray.reduce((sum, item) => sum + item.count, 0)

      const deviceTypes = deviceTypesArray.map((item) => ({
        name: item.name,
        count: item.count,
        percentage: totalDeviceTypes > 0 ? ((item.count / totalDeviceTypes) * 100).toFixed(1) : 0
      }))

      const deviceBrands = deviceBrandsArray.map((item) => ({
        name: item.name,
        count: item.count,
        percentage: totalDeviceBrands > 0 ? ((item.count / totalDeviceBrands) * 100).toFixed(1) : 0
      }))

      ctx.account.log('Devices loaded from access_log', {
        level: 'info',
        json: {
          deviceTypesCount: deviceTypes.length,
          deviceBrandsCount: deviceBrands.length,
          totalDeviceTypes,
          totalDeviceBrands
        }
      })

      return { success: true, deviceTypes, deviceBrands }
    } catch (error) {
      ctx.account.log('Error in apiGetDevicesRoute', {
        level: 'error',
        json: { error: error.message, stack: error.stack }
      })
      return { success: false, error: error.message }
    }
  })

// @shared-route
export const apiGetSessionsByDayRoute = app
  .query((s) => ({
    period: s.string().optional(),
    startDate: s.string().optional(),
    endDate: s.string().optional(),
    landingPath: s.string().optional()
  }))
  .get('/sessions-by-day', async (ctx, req) => {
    requireRealUser(ctx)
    try {
      // Определяем границы периода
      let periodStart: Date
      let periodEnd: Date
      let dateCondition = ''

      if (req.query.startDate && req.query.endDate) {
        periodStart = new Date(req.query.startDate)
        periodEnd = new Date(req.query.endDate)

        const startDateStr = periodStart.toISOString().split('T')[0]
        const endDateStr = periodEnd.toISOString().split('T')[0]

        dateCondition = `dt >= toDate('${startDateStr}') AND dt <= toDate('${endDateStr}')`
      } else {
        const periodParam = req.query.period || '90'
        periodEnd = new Date()
        periodEnd.setHours(23, 59, 59, 999)

        if (periodParam === 'today') {
          periodStart = new Date()
          periodStart.setHours(0, 0, 0, 0)
          dateCondition = 'dt = today()'
        } else if (periodParam === 'yesterday') {
          periodStart = new Date()
          periodStart.setDate(periodStart.getDate() - 1)
          periodStart.setHours(0, 0, 0, 0)
          periodEnd = new Date()
          periodEnd.setHours(0, 0, 0, 0)
          dateCondition = 'dt = yesterday()'
        } else {
          const period = parseInt(periodParam)
          periodStart = new Date()
          periodStart.setDate(periodStart.getDate() - period)
          periodStart.setHours(0, 0, 0, 0)
          dateCondition = `dt >= subtractDays(today(), ${period})`
        }
      }

      // Получаем активные лендинги или конкретный лендинг
      let landings
      if (req.query.landingPath) {
        landings = await LandingsTable.findAll(ctx, {
          where: { path: req.query.landingPath, isActive: true },
          limit: 1
        })
      } else {
        landings = await LandingsTable.findAll(ctx, {
          where: { isActive: true },
          limit: 1000
        })
      }

      if (landings.length === 0) {
        return { success: true, data: [] }
      }

      // Собираем сессии по дням для всех лендингов
      const sessionsByDay = new Map<string, Set<string>>()

      for (const landing of landings) {
        const landingCondition = `(urlPath LIKE '%${landing.path}%' OR urlPath LIKE '%${landing.path}/%')`

        // Запрос для получения сессий по дням
        const query = `
        SELECT
          dt,
          groupUniqArray(uid) as uids
        FROM chatium_ai.behaviour2_log
        WHERE
          startsWith(urlPath, 'https')
          AND ${landingCondition}
          AND ${dateCondition}
        GROUP BY dt
        ORDER BY dt ASC
      `

        const result = await queryAi(ctx, query)

        for (const row of result.rows) {
          const date = new Date(row.dt)
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

          if (!sessionsByDay.has(dateKey)) {
            sessionsByDay.set(dateKey, new Set())
          }

          // Добавляем уникальные uid из этого дня
          const uids = row.uids || []
          for (const uid of uids) {
            sessionsByDay.get(dateKey).add(uid)
          }
        }
      }

      // Преобразуем в массив и сортируем
      const data = Array.from(sessionsByDay.entries())
        .map(([date, uidsSet]) => ({ date, sessions: uidsSet.size }))
        .sort((a, b) => a.date.localeCompare(b.date))

      ctx.account.log('Sessions by day loaded', {
        level: 'info',
        json: {
          totalDays: data.length,
          totalSessions: data.reduce((sum, item) => sum + item.sessions, 0)
        }
      })

      return { success: true, data }
    } catch (error) {
      ctx.account.log('Error in apiGetSessionsByDayRoute', {
        level: 'error',
        json: { error: error.message, stack: error.stack }
      })
      return { success: false, error: error.message }
    }
  })
