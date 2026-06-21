import { requireAnyUser } from '@app/auth'
import { sendDataToSocket, genSocketId } from '@app/socket'
// @ts-ignore
import { gcQueryAi } from '@gc-mcp-server/sdk'
import { cancelScheduledJob } from '@app/jobs'
import AnalyticsSettings from '../tables/settings.table'
import { deduplicateEvents } from '../lib/events/deduplication'
import { buildEventFilterConditions } from '../lib/events/filters'
import { buildSearchConditions } from '../lib/events/search'
import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'
import { addActiveJobId, removeActiveJobId } from './settings'

// @shared-route
// Единый API для получения событий - поддерживает пагинацию и polling
export const apiEventsRoute = app
  .body((s) => ({
    mode: s.string().default('list'), // 'list' (пагинация) | 'poll' (новые события)
    limit: s.number().default(25),
    offset: s.number().default(0),
    sinceTimestamp: s.string().optional(), // Для mode='poll': события ПОСЛЕ этого времени
    maxTimestamp: s.string().optional() // Для mode='list': события ДО этого времени
  }))
  .post('/events', async (ctx, req) => {
    requireAnyUser(ctx)
    await applyDebugLevel(ctx, 'events:route')

    const { mode, limit, offset, sinceTimestamp, maxTimestamp } = req.body
    Debug.info(
      ctx,
      `[events] входящий запрос: mode=${mode}, limit=${limit}, offset=${offset}, since=${sinceTimestamp || '-'}, max=${maxTimestamp || '-'}`
    )

    try {
      // Получаем фильтр событий из настроек
      const filterSetting = await AnalyticsSettings.findOneBy(ctx, {
        key: 'events_filter'
      })

      let eventTypesFilter: string[] = []
      if (filterSetting && filterSetting.value) {
        try {
          eventTypesFilter = JSON.parse(filterSetting.value)
        } catch {
          eventTypesFilter = []
        }
      }

      // Строим условие для фильтрации событий
      const actionFilter = buildEventFilterConditions(eventTypesFilter)

      if (mode === 'poll') {
        // ============ РЕЖИМ POLLING (для джобы мониторинга) ============
        // Получаем НОВЫЕ события после sinceTimestamp
        const timestampFilter = sinceTimestamp
          ? `AND ts > '${sinceTimestamp.replace(/'/g, "''")}'`
          : `AND ts >= now() - INTERVAL 30 MINUTE`

        const query = `
        SELECT 
          ts, dt, url, urlPath, action, action_param1, action_param2, action_param3,
          uid, user_id, session_id, title, referer, user_agent,
          user_first_name, user_last_name, user_email, user_phone, user_account_role,
          ip, location_country, location_city, gc_visitor_id,
          ua_os_name, ua_device_type, ua_client_name, ua_client_version,
          utm_source, utm_medium, utm_campaign, utm_term, utm_content
        FROM chatium_ai.access_log
        WHERE (${actionFilter})
          AND dt >= today() - 7
          ${timestampFilter}
        ORDER BY ts ASC
        LIMIT 100
      `

        const result = await gcQueryAi(ctx, query)
        const deduplicatedEvents = deduplicateEvents(result.rows || [])

        Debug.info(
          ctx,
          `[events] poll выполнен: rows=${result.rows?.length || 0}, dedup=${deduplicatedEvents.length}, since=${sinceTimestamp || '-'}`
        )

        return {
          success: true,
          events: deduplicatedEvents,
          total: deduplicatedEvents.length,
          latestTimestamp:
            deduplicatedEvents.length > 0
              ? deduplicatedEvents[deduplicatedEvents.length - 1].ts
              : sinceTimestamp
        }
      } else {
        // ============ РЕЖИМ LIST (для пагинации) ============
        // С дедупликацией для фильтрации дубликатов из-за iframe
        const timestampFilter = maxTimestamp
          ? `AND ts <= '${maxTimestamp.replace(/'/g, "''")}'`
          : ''

        const limitNum = Number(limit) || 25
        const offsetNum = Number(offset) || 0

        // Итеративно загружаем события, пока не наберем offset+limit дедуплицированных
        let allFetchedEvents: any[] = []
        let dbOffset = 0
        const batchSize = 100
        const maxIterations = 20 // Защита от бесконечного цикла
        let iteration = 0

        while (iteration < maxIterations) {
          iteration++

          const query = `
          SELECT 
            ts, dt, url, urlPath, action, action_param1, action_param2, action_param3,
            uid, user_id, session_id, title, referer, user_agent,
            user_first_name, user_last_name, user_email, user_phone, user_account_role,
            ip, location_country, location_city, gc_visitor_id,
            ua_os_name, ua_device_type, ua_client_name, ua_client_version,
            utm_source, utm_medium, utm_campaign, utm_term, utm_content
          FROM chatium_ai.access_log
          WHERE (${actionFilter})
            AND dt >= today() - 7
            ${timestampFilter}
          ORDER BY ts DESC
          LIMIT ${batchSize}
          OFFSET ${dbOffset}
        `

          const result = await gcQueryAi(ctx, query)
          const batch = result.rows || []

          if (batch.length === 0) {
            // Больше событий в БД нет
            break
          }

          allFetchedEvents = allFetchedEvents.concat(batch)
          dbOffset += batchSize

          // Применяем дедупликацию к накопленным событиям
          const deduplicatedEvents = deduplicateEvents(allFetchedEvents)

          // Проверяем, набрали ли мы достаточно уникальных событий
          if (deduplicatedEvents.length >= offsetNum + limitNum) {
            // Достаточно! Применяем offset и limit к дедуплицированным
            const events = deduplicatedEvents.slice(offsetNum, offsetNum + limitNum)

            Debug.info(
              ctx,
              `[events] list страница готова: fetched=${allFetchedEvents.length}, dedup=${deduplicatedEvents.length}, return=${events.length}, offset=${offsetNum}, limit=${limitNum}, iterations=${iteration}`
            )

            return {
              success: true,
              events,
              total: events.length
            }
          }
        }

        // Если дошли сюда - загрузили все доступные события
        const deduplicatedEvents = deduplicateEvents(allFetchedEvents)
        const events = deduplicatedEvents.slice(offsetNum, offsetNum + limitNum)

        Debug.info(
          ctx,
          `[events] list завершён: fetched=${allFetchedEvents.length}, dedup=${deduplicatedEvents.length}, return=${events.length}, offset=${offsetNum}, limit=${limitNum}`
        )

        return {
          success: true,
          events,
          total: events.length
        }
      }
    } catch (error: any) {
      Debug.error(ctx, `[events] ошибка выполнения (${mode}): ${error?.message || error}`)

      return {
        success: false,
        message: error.message,
        events: [],
        total: 0
      }
    }
  })

// Алиас для обратной совместимости
export const apiEventsListRoute = apiEventsRoute

// Job для мониторинга событий
export const monitorEventsJob = app.job(
  '/monitor-events',
  async (
    ctx,
    params: {
      userId: string
      socketId: string
      lastProcessedTs?: string // Временная метка последнего обработанного события
      parentTaskId?: string | number // TaskId родительского джоба (для информации, не для удаления)
    }
  ) => {
    await applyDebugLevel(ctx, 'events:monitor-job')

    // ✅ 1. ВСЕГДА определяем свой taskId через поиск в ActiveJobs по metadata
    // Это единственный надёжный способ получить правильный taskId текущего джоба
    // Настройка active_monitoring НЕ используется для определения taskId, т.к. там хранится taskId предыдущего джоба
    const { ActiveJobs } = await import('../tables/active-jobs.table')
    let currentTaskId: string | undefined

    try {
      // Ищем все job'ы типа 'monitor-events' в ActiveJobs
      const activeJobs = await ActiveJobs.findAll(ctx, {
        where: {
          jobType: 'monitor-events'
        }
      })

      // Фильтруем по metadata (socketId и userId должны совпадать)
      // Это гарантирует, что мы найдём именно наш текущий job
      for (const job of activeJobs) {
        if (job.metadata && typeof job.metadata === 'object') {
          const metadata = job.metadata as any
          if (metadata.socketId === params.socketId && metadata.userId === params.userId) {
            currentTaskId = job.taskId
            Debug.info(
              ctx,
              `[events:monitor-job] найден taskId ${currentTaskId} в ActiveJobs по metadata (socketId=${params.socketId}, userId=${params.userId})`
            )
            break
          }
        }
      }

      if (!currentTaskId) {
        Debug.warn(
          ctx,
          `[events:monitor-job] taskId не найден в ActiveJobs - это может быть новый job или race condition (socketId=${params.socketId}, userId=${params.userId})`
        )
      }
    } catch (error: any) {
      // Игнорируем ошибки поиска в ActiveJobs - не критично
      // Если поиск не удался, job продолжит работу, но может не удалиться из ActiveJobs при остановке
      Debug.warn(
        ctx,
        `[events:monitor-job] не удалось найти taskId в ActiveJobs: ${error?.message || error}`
      )
    }

    // ✅ 2. Примечание: parentTaskId - это taskId предыдущего job'а в цепочке
    // Он используется только для логирования и передачи следующему job'у как parentTaskId
    // parentTaskId НЕ используется для поиска currentTaskId, потому что это разные job'ы

    // ✅ 3. НЕ удаляем родителя - он уже удалён предыдущим job'ом!
    // parentTaskId передан только для информации/логирования

    // ✅ 4. Проверяем флаг остановки (ДО основной логики)
    const { isStopAllJobsFlagSet } = await import('./settings')
    if (await isStopAllJobsFlagSet(ctx)) {
      Debug.info(
        ctx,
        '[events:monitor-job] обнаружен флаг остановки всех джобов, прекращаем работу'
      )
      // Удаляем свой taskId из списка активных (если он найден)
      if (currentTaskId) {
        await removeActiveJobId(ctx, currentTaskId)
      } else {
        // Если taskId не найден, но флаг остановки установлен - это нормально
        // Job просто завершится без удаления из ActiveJobs (может быть уже удалён)
        Debug.info(
          ctx,
          '[events:monitor-job] taskId не найден, завершаем работу без удаления из ActiveJobs'
        )
      }
      return // Самоуничтожение
    }

    Debug.info(
      ctx,
      `[events:monitor-job] запуск для socket=${params.socketId}, user=${params.userId}, lastTs=${params.lastProcessedTs || '-'}, currentTaskId=${currentTaskId || '-'}, parentTaskId=${params.parentTaskId || '-'}`
    )

    try {
      // Проверяем, активен ли мониторинг через настройки
      const monitoringSetting = await AnalyticsSettings.findOneBy(ctx, {
        key: 'active_monitoring'
      })

      if (!monitoringSetting) {
        // Мониторинг остановлен - не планируем следующую проверку
        Debug.info(ctx, '[events:monitor-job] мониторинг выключен, выходим')
        // Удаляем свой taskId из списка активных при завершении
        if (currentTaskId) {
          await removeActiveJobId(ctx, currentTaskId)
        }
        return
      }

      // Используем единый API endpoint в режиме 'poll'
      const result = await apiEventsRoute.run(ctx, {
        mode: 'poll',
        sinceTimestamp: params.lastProcessedTs
      })

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch events')
      }

      const newEvents = result.events || []

      // Отправляем события через WebSocket
      if (newEvents.length > 0) {
        await sendDataToSocket(ctx, params.socketId, {
          type: 'events-update',
          data: newEvents,
          timestamp: new Date().toISOString()
        })

        Debug.info(
          ctx,
          `[events:monitor-job] отправлено ${newEvents.length} событий через WebSocket`
        )
      }

      // Используем latestTimestamp из API
      const newLastProcessedTs = result.latestTimestamp || params.lastProcessedTs

      // ✅ Планируем следующую проверку через 15 секунд
      // Передаём свой taskId как parentTaskId следующему job'у
      const nextTaskId = await monitorEventsJob.scheduleJobAfter(ctx, 15, 'seconds', {
        ...params,
        lastProcessedTs: newLastProcessedTs,
        parentTaskId: currentTaskId // ✅ Передаём свой taskId как parentTaskId
      })

      // ✅ СРАЗУ записываем новый taskId в таблицу ActiveJobs
      // Следующий джоб найдёт свой taskId через поиск в ActiveJobs по metadata
      await addActiveJobId(ctx, nextTaskId, {
        jobType: 'monitor-events',
        parentTaskId: currentTaskId,
        metadata: {
          userId: params.userId,
          socketId: params.socketId
        }
      })

      // ✅ Обновляем taskId в настройках активного мониторинга (для совместимости и отладки)
      // НО: следующий джоб НЕ использует эту настройку для определения своего taskId
      // Он всегда ищет свой taskId в ActiveJobs по metadata
      const updatedSetting = await AnalyticsSettings.findOneBy(ctx, {
        key: 'active_monitoring'
      })

      if (updatedSetting) {
        const monitoringData = JSON.parse(updatedSetting.value)
        monitoringData.taskId = String(nextTaskId)

        await AnalyticsSettings.update(ctx, {
          id: updatedSetting.id,
          value: JSON.stringify(monitoringData)
        })
      }

      // ✅ Удаляем СВОЙ taskId из таблицы ПОСЛЕ того, как записали новый
      // Это гарантирует: если запись удалена - job точно завершился и запланировал следующий
      if (currentTaskId) {
        await removeActiveJobId(ctx, currentTaskId)
      }
    } catch (error: any) {
      Debug.error(ctx, `[events:monitor-job] ошибка выполнения: ${error?.message || error}`)

      // Проверяем, активен ли ещё мониторинг
      const errorSetting = await AnalyticsSettings.findOneBy(ctx, {
        key: 'active_monitoring'
      })

      if (errorSetting) {
        // Даже при ошибке планируем следующую попытку
        const retryTaskId = await monitorEventsJob.scheduleJobAfter(ctx, 15, 'seconds', {
          ...params,
          parentTaskId: currentTaskId // ✅ Передаём свой taskId как parentTaskId
        })

        // ✅ Записываем новый taskId в таблицу ActiveJobs
        // Следующий джоб найдёт свой taskId через поиск в ActiveJobs по metadata
        await addActiveJobId(ctx, retryTaskId, {
          jobType: 'monitor-events',
          parentTaskId: currentTaskId,
          metadata: {
            userId: params.userId,
            socketId: params.socketId
          }
        })

        // ✅ Обновляем taskId в настройках активного мониторинга (для совместимости и отладки)
        // НО: следующий джоб НЕ использует эту настройку для определения своего taskId
        const monitoringData = JSON.parse(errorSetting.value)
        monitoringData.taskId = String(retryTaskId)

        await AnalyticsSettings.update(ctx, {
          id: errorSetting.id,
          value: JSON.stringify(monitoringData)
        })

        // ✅ Удаляем свой taskId из таблицы ПОСЛЕ планирования ретрая
        if (currentTaskId) {
          await removeActiveJobId(ctx, currentTaskId)
        }

        Debug.warn(
          ctx,
          `[events:monitor-job] планируем повтор через 15 секунд, taskId=${retryTaskId}`
        )
      } else {
        // Мониторинг остановлен - удаляем свой taskId
        if (currentTaskId) {
          await removeActiveJobId(ctx, currentTaskId)
        }
      }
    }
  }
)

// @shared-route
// ⚠️ ОБЩИЙ МОНИТОРИНГ: В системе может быть только один активный мониторинг для всех админов
// Все подключённые пользователи получают одни и те же события через общий WebSocket
export const apiStartMonitoringRoute = app.post('/start-monitoring', async (ctx, req) => {
  requireAnyUser(ctx)
  await applyDebugLevel(ctx, 'events:start-monitoring')

  // Используем ctx.user.id или fallback для тестов
  const userId = ctx.user?.id || 'test-user-' + Date.now()

  // Проверяем, есть ли уже активный мониторинг в настройках
  const existingSetting = await AnalyticsSettings.findOneBy(ctx, {
    key: 'active_monitoring'
  })

  if (existingSetting) {
    // Мониторинг уже запущен - возвращаем общий socketId для подключения
    // Любой админ может подключиться к существующему мониторингу
    const monitoringData = JSON.parse(existingSetting.value)
    const encodedSocketId = await genSocketId(ctx, monitoringData.socketId)
    return {
      success: true,
      socketId: encodedSocketId,
      message: 'Мониторинг уже активен',
      alreadyActive: true
    }
  }

  const socketId = `events-monitor-${userId}`
  const encodedSocketId = await genSocketId(ctx, socketId)

  // Запускаем job для мониторинга и получаем taskId
  // Используем переданный timestamp или текущее время
  const lastProcessedTs = req.body?.lastProcessedTs || new Date().toISOString()
  const taskId = await monitorEventsJob.scheduleJobAsap(ctx, {
    userId: userId,
    socketId,
    lastProcessedTs
    // parentTaskId не передаём для первого джоба - он будет undefined
  })

  // Сохраняем информацию о мониторинге в настройках
  const monitoringData = {
    userId: userId,
    socketId,
    taskId: String(taskId),
    startedAt: new Date().toISOString()
  }

  await AnalyticsSettings.create(ctx, {
    key: 'active_monitoring',
    value: JSON.stringify(monitoringData),
    description: 'Активный мониторинг событий'
  })

  // Добавляем taskId в список активных джобов с jobType и metadata
  await addActiveJobId(ctx, taskId, {
    jobType: 'monitor-events',
    parentTaskId: undefined, // Для первого джоба undefined
    metadata: {
      userId: userId,
      socketId: socketId
    }
  })

  Debug.info(ctx, `[events:start-monitoring] запущен мониторинг user=${userId}, taskId=${taskId}`)

  return {
    success: true,
    socketId: encodedSocketId,
    message: 'Мониторинг запущен'
  }
})

// @shared-route
// ⚠️ ОСТАНАВЛИВАЕТ ОБЩИЙ МОНИТОРИНГ: влияет на всех подключённых админов
export const apiStopMonitoringRoute = app.post('/stop-monitoring', async (ctx, req) => {
  requireAnyUser(ctx)
  await applyDebugLevel(ctx, 'events:stop-monitoring')

  // Находим активный мониторинг в настройках
  const monitoringSetting = await AnalyticsSettings.findOneBy(ctx, {
    key: 'active_monitoring'
  })

  if (!monitoringSetting) {
    return {
      success: false,
      message: 'Активный мониторинг не найден'
    }
  }

  const monitoringData = JSON.parse(monitoringSetting.value)

  // Отменяем запланированный job
  if (monitoringData.taskId) {
    try {
      await cancelScheduledJob(ctx, Number(monitoringData.taskId))
      Debug.info(ctx, `[events:stop-monitoring] отменён job ${monitoringData.taskId}`)
    } catch (error: any) {
      Debug.warn(
        ctx,
        `[events:stop-monitoring] не удалось отменить job ${monitoringData.taskId}: ${error?.message || error}`
      )
    }

    // Удаляем taskId из списка активных джобов
    try {
      await removeActiveJobId(ctx, monitoringData.taskId)
    } catch (error: any) {
      Debug.warn(
        ctx,
        `[events:stop-monitoring] не удалось удалить taskId из списка активных джобов: ${error?.message || error}`
      )
    }
  }

  // Удаляем настройку мониторинга
  await AnalyticsSettings.delete(ctx, monitoringSetting.id)

  Debug.info(ctx, '[events:stop-monitoring] мониторинг остановлен')

  return {
    success: true,
    message: 'Мониторинг остановлен'
  }
})

// @shared-route
// Возвращает статус общего мониторинга (одинаковый для всех админов)
export const apiMonitoringStatusRoute = app.get('/monitoring-status', async (ctx, req) => {
  requireAnyUser(ctx)
  await applyDebugLevel(ctx, 'events:monitoring-status')

  const monitoringSetting = await AnalyticsSettings.findOneBy(ctx, {
    key: 'active_monitoring'
  })

  let monitoringData = null
  if (monitoringSetting) {
    monitoringData = JSON.parse(monitoringSetting.value)
  }

  Debug.info(ctx, `[events:monitoring-status] active=${!!monitoringSetting}`)

  return {
    success: true,
    isActive: !!monitoringSetting,
    monitoring: monitoringData
  }
})

// @shared-route
export const apiEventDetailsRoute = app
  .body((s) => ({
    urlPath: s.string(),
    timestamp: s.string()
  }))
  .post('/details', async (ctx, req) => {
    requireAnyUser(ctx)
    await applyDebugLevel(ctx, 'events:details')

    const { urlPath, timestamp } = req.body

    try {
      // Запрашиваем детальную информацию о событии из ClickHouse
      const query = `
      SELECT 
        *
      FROM chatium_ai.access_log
      WHERE urlPath = '${urlPath.replace(/'/g, "''")}'
        AND ts = '${timestamp.replace(/'/g, "''")}'
      LIMIT 1
    `

      const result = await gcQueryAi(ctx, query)

      if (!result.rows || result.rows.length === 0) {
        return {
          success: false,
          error: 'Событие не найдено'
        }
      }

      return {
        success: true,
        event: result.rows[0]
      }
    } catch (error: any) {
      Debug.error(
        ctx,
        `[events:details] ошибка загрузки (${urlPath}, ${timestamp}): ${error?.message || error}`
      )
      return {
        success: false,
        error: error.message
      }
    }
  })

// @shared-route
export const apiSearchEventsRoute = app
  .body((s) => ({
    query: s.string(),
    limit: s.number().default(25),
    offset: s.number().default(0),
    getTotalOnly: s.boolean().optional() // Если true, возвращает только total без событий
  }))
  .post('/search', async (ctx, req) => {
    requireAnyUser(ctx)
    await applyDebugLevel(ctx, 'events:search')

    const { query, limit, offset, getTotalOnly } = req.body

    if (!query || query.trim() === '') {
      return {
        success: false,
        message: 'Поисковый запрос не может быть пустым',
        events: [],
        total: 0
      }
    }

    try {
      // Получаем фильтр событий из настроек
      const filterSetting = await AnalyticsSettings.findOneBy(ctx, {
        key: 'events_filter'
      })

      let eventTypesFilter: string[] = []
      if (filterSetting && filterSetting.value) {
        try {
          eventTypesFilter = JSON.parse(filterSetting.value)
        } catch {
          eventTypesFilter = []
        }
      }

      // Строим условие для фильтрации событий
      const actionFilter = buildEventFilterConditions(eventTypesFilter)

      const searchConditions = buildSearchConditions(query)

      if (searchConditions.length === 0) {
        return {
          success: true,
          events: [],
          total: 0
        }
      }

      // Если запрашивается только total, делаем упрощенный запрос
      if (getTotalOnly) {
        // Для получения точного total нужно получить все результаты и применить дедупликацию
        // Но это может быть медленно, поэтому получаем достаточно много (5000) для оценки
        const totalFetchLimit = 5000
        const escapedQuery = query.replace(/'/g, "''")

        const totalQuery = `
        SELECT 
          ts, dt, url, urlPath, action, action_param1, action_param2, action_param3,
          uid, user_id, session_id, title, referer, user_agent,
          user_first_name, user_last_name, user_email, user_phone, user_account_role,
          ip, location_country, location_city, gc_visitor_id,
          ua_os_name, ua_device_type, ua_client_name, ua_client_version,
          utm_source, utm_medium, utm_campaign, utm_term, utm_content
        FROM chatium_ai.access_log
        WHERE (
          user_email LIKE '%${escapedQuery}%'
          OR user_id LIKE '%${escapedQuery}%'
          OR uid LIKE '%${escapedQuery}%'
          OR user_first_name LIKE '%${escapedQuery}%'
          OR user_last_name LIKE '%${escapedQuery}%'
          OR ip = '${escapedQuery}'
          OR action LIKE '%${escapedQuery}%'
          OR url LIKE '%${escapedQuery}%'
          OR urlPath LIKE '%${escapedQuery}%'
          OR title LIKE '%${escapedQuery}%'
        )
          AND (${actionFilter})
          AND dt >= today() - 90
        ORDER BY ts DESC
        LIMIT ${totalFetchLimit}
      `

        const totalResult = await gcQueryAi(ctx, totalQuery)
        let totalEvents = totalResult.rows || []
        totalEvents = deduplicateEvents(totalEvents)

        // Если получили меньше чем лимит, значит это и есть общее количество
        // Если получили лимит, значит результатов больше (приблизительно)
        const estimatedTotal =
          totalEvents.length < totalFetchLimit ? totalEvents.length : totalEvents.length // В реальности может быть больше, но для UI достаточно

        return {
          success: true,
          events: [],
          total: estimatedTotal
        }
      }

      // Специальная обработка для email или user_id
      const isEmailSearch = query.includes('@')
      const isUserIdSearch = query.includes(':') // GetCourse user_id содержит двоеточие

      let events: any[] = []

      // Упрощенный приоритетный поиск
      // Сначала пробуем поиск по наиболее вероятным полям
      // Для первой страницы (offset = 0) получаем много результатов для точного подсчета total
      // Для последующих страниц получаем только необходимое количество
      const isFirstPage = offset === 0
      // На первой странице получаем достаточно много (10000) для точного подсчета total после дедупликации
      // На последующих страницах получаем только необходимое количество + запас для дедупликации
      const fetchLimit = isFirstPage
        ? 10000 // На первой странице получаем много для точного total
        : offset + limit + 200 // На последующих страницах только необходимое + запас
      const prioritySearchQuery = `
      SELECT 
        ts, dt, url, urlPath, action, action_param1, action_param2, action_param3,
        uid, user_id, session_id, title, referer, user_agent,
        user_first_name, user_last_name, user_email, user_phone, user_account_role,
        ip, location_country, location_city, gc_visitor_id,
        ua_os_name, ua_device_type, ua_client_name, ua_client_version,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content
      FROM chatium_ai.access_log
      WHERE (
        user_email LIKE '%${query.replace(/'/g, "''")}%'
        OR user_id LIKE '%${query.replace(/'/g, "''")}%'
        OR uid LIKE '%${query.replace(/'/g, "''")}%'
        OR user_first_name LIKE '%${query.replace(/'/g, "''")}%'
        OR user_last_name LIKE '%${query.replace(/'/g, "''")}%'
        OR ip = '${query.replace(/'/g, "''")}'
        OR action LIKE '%${query.replace(/'/g, "''")}%'
        OR url LIKE '%${query.replace(/'/g, "''")}%'
        OR urlPath LIKE '%${query.replace(/'/g, "''")}%'
        OR title LIKE '%${query.replace(/'/g, "''")}%'
      )
        AND (${actionFilter})
        AND dt >= today() - 90
      ORDER BY ts DESC
      LIMIT ${fetchLimit}
    `

      const priorityResult = await gcQueryAi(ctx, prioritySearchQuery)
      events = priorityResult.rows || []

      // Если приоритетный поиск не дал результатов, пробуем расширенный
      if (events.length === 0) {
        const searchQuery = `
        SELECT 
          ts, dt, url, urlPath, action, action_param1, action_param2, action_param3,
          uid, user_id, session_id, title, referer, user_agent,
          user_first_name, user_last_name, user_email, user_phone, user_account_role,
          ip, location_country, location_city, gc_visitor_id,
          ua_os_name, ua_device_type, ua_client_name, ua_client_version,
          utm_source, utm_medium, utm_campaign, utm_term, utm_content
        FROM chatium_ai.access_log
        WHERE (${searchConditions.join(' OR ')})
          AND (${actionFilter})
          AND dt >= today() - 90
        ORDER BY ts DESC
        LIMIT ${fetchLimit}
      `

        const result = await gcQueryAi(ctx, searchQuery)
        events = result.rows || []
      }

      // Дедупликация результатов
      events = deduplicateEvents(events)

      // Специальная обработка: если нашли события с user_id,
      // добавляем визиты пользователя через связку user_id -> form events -> uid
      // Собираем все user_id из найденных событий
      const userIds = new Set<string>()
      for (const event of events) {
        if (event.user_id) {
          userIds.add(event.user_id)
        }
      }

      // Если есть user_id, ищем связанные визиты
      if (userIds.size > 0) {
        // Находим все uid через события form/sent для этих user_id
        const userIdsArray = Array.from(userIds)
        const formEventsQuery = `
          SELECT DISTINCT uid, user_id
          FROM chatium_ai.access_log
          WHERE urlPath = 'event://getcourse/form/sent'
            AND user_id IN (${userIdsArray.map((id) => `'${id.replace(/'/g, "''")}'`).join(', ')})
            AND uid != ''
            AND dt >= today() - 90
        `

        const formEventsResult = await gcQueryAi(ctx, formEventsQuery)
        const uidMappings = formEventsResult.rows || []

        if (uidMappings.length > 0) {
          // Собираем все uid
          const uids = uidMappings.map((m: any) => m.uid).filter(Boolean)

          if (uids.length > 0) {
            // Находим визиты (HTTP события) этих пользователей по uid
            // ВАЖНО: фильтруем по исходному запросу поиска, чтобы не добавлять все визиты пользователя
            const escapedQuery = query.replace(/'/g, "''")
            const visitsQuery = `
              SELECT 
                ts, dt, url, urlPath, action, action_param1, action_param2, action_param3,
                uid, user_id, session_id, title, referer, user_agent,
                user_first_name, user_last_name, user_email, user_phone, user_account_role,
                ip, location_country, location_city, gc_visitor_id,
                ua_os_name, ua_device_type, ua_client_name, ua_client_version,
                utm_source, utm_medium, utm_campaign, utm_term, utm_content
              FROM chatium_ai.access_log
              WHERE uid IN (${uids.map((uid: any) => `'${uid.replace(/'/g, "''")}'`).join(', ')})
                AND (startsWith(urlPath, 'http') OR action != '')
                AND (
                  url LIKE '%${escapedQuery}%'
                  OR urlPath LIKE '%${escapedQuery}%'
                  OR action LIKE '%${escapedQuery}%'
                  OR action_param1 LIKE '%${escapedQuery}%'
                  OR action_param2 LIKE '%${escapedQuery}%'
                  OR action_param3 LIKE '%${escapedQuery}%'
                  OR user_email LIKE '%${escapedQuery}%'
                  OR user_id LIKE '%${escapedQuery}%'
                  OR uid LIKE '%${escapedQuery}%'
                  OR ip = '${escapedQuery}'
                  OR title LIKE '%${escapedQuery}%'
                )
                AND (${actionFilter})
                AND dt >= today() - 90
              ORDER BY ts DESC
              LIMIT ${fetchLimit}
            `

            const visitsResult = await gcQueryAi(ctx, visitsQuery)
            const visits = visitsResult.rows || []

            // Объединяем события и визиты, сортируем по времени
            events = [...events, ...visits]
            events.sort((a: any, b: any) => {
              const tsA = new Date(a.ts || '').getTime()
              const tsB = new Date(b.ts || '').getTime()
              return tsB - tsA // DESC
            })

            // Дедупликация объединенного списка
            events = deduplicateEvents(events)
          }
        }
      }

      // Дедупликация всех результатов (если еще не была применена)
      events = deduplicateEvents(events)

      // Сохраняем общее количество до применения пагинации
      // На первой странице вычисляем точное total
      // На последующих страницах не вычисляем total (будет undefined, фронтенд использует сохраненное значение)
      let total: number | undefined = undefined

      if (isFirstPage) {
        // На первой странице: если получили меньше чем fetchLimit, значит это точное количество
        // Если получили ровно fetchLimit, значит результатов может быть больше, но для UI показываем это значение
        total = events.length
      }
      // На последующих страницах total остается undefined - фронтенд использует значение с первой страницы

      // Применяем пагинацию (offset и limit)
      events = events.slice(offset, offset + limit)

      Debug.info(
        ctx,
        `[events:search] выполнен поиск '${query}' (offset=${offset}, limit=${limit}, total=${total || 'undefined (not first page)'}, returned=${events.length}, isFirstPage=${isFirstPage})`
      )

      return {
        success: true,
        events,
        total: total // undefined на последующих страницах
      }
    } catch (error: any) {
      Debug.error(ctx, `[events:search] ошибка (${query}): ${error?.message || error}`)

      return {
        success: false,
        message: error.message,
        events: [],
        total: 0
      }
    }
  })
