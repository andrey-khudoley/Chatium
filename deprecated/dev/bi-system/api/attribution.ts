import { requireAnyUser } from '@app/auth'
import { gcQueryAi } from '@gc-mcp-server/sdk'
import { parseUrlParams } from '../lib/events/urlParser'
import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'

/**
 * API для получения параметров первой/последней сессии пользователя
 * ПРОСТАЯ ЛОГИКА: только ClickHouse, без Heap, без job'ов
 */
export const apiAttributionRoute = app
  .body((s) => ({
    userId: s.string(),
    attribution: s.string().default('first'), // 'first' | 'last'
    param: s.string().optional() // Если указан - возвращает конкретный параметр
  }))
  .post('/attribution', async (ctx, req) => {
    requireAnyUser(ctx)
    await applyDebugLevel(ctx, 'attribution')

    const { userId, attribution, param } = req.body
    Debug.info(
      ctx,
      `[attribution] запрос user_id=${userId}, mode=${attribution}, param=${param || 'all'}`
    )

    if (!userId) {
      return {
        success: false,
        error: 'userId обязателен'
      }
    }

    try {
      // Шаг 1: user_id → находим все uid через form/sent
      const uidsQuery = `
      SELECT DISTINCT uid
      FROM chatium_ai.access_log
      WHERE user_id = '${userId.replace(/'/g, "''")}'
        AND uid != ''
        AND urlPath = 'event://getcourse/form/sent'
        AND dt >= today() - 30
    `

      const uidsResult = await gcQueryAi(ctx, uidsQuery)

      if (!uidsResult.rows || uidsResult.rows.length === 0) {
        Debug.info(ctx, `[attribution] UID не найдены для пользователя ${userId}`)
        return {
          success: true,
          params: {},
          message: 'UID не найдены для этого user_id'
        }
      }

      // Шаг 2: Для каждого uid → выбираем все уникальные сессии
      const allSessions = []

      for (const uidRow of uidsResult.rows) {
        const uid = uidRow.uid

        // Получаем все уникальные session_id для этого uid
        const sessionsQuery = `
        SELECT DISTINCT session_id, min(ts) as first_ts
        FROM chatium_ai.access_log
        WHERE uid = '${uid.replace(/'/g, "''")}'
          AND session_id != ''
          AND startsWith(urlPath, 'http')
          AND dt >= today() - 30
        GROUP BY session_id
        ORDER BY first_ts ${attribution === 'first' ? 'ASC' : 'DESC'}
      `

        const sessionsResult = await gcQueryAi(ctx, sessionsQuery)

        if (sessionsResult.rows && sessionsResult.rows.length > 0) {
          for (const sessionRow of sessionsResult.rows) {
            allSessions.push({
              uid: uid,
              sessionId: sessionRow.session_id,
              firstTs: sessionRow.first_ts
            })
          }
        }
      }

      if (allSessions.length === 0) {
        Debug.info(ctx, `[attribution] не найдено сессий для UID пользователя ${userId}`)
        return {
          success: true,
          params: {},
          message: 'Сессии не найдены'
        }
      }

      // Сортируем все сессии по времени
      allSessions.sort((a, b) => {
        const aTime = new Date(a.firstTs).getTime()
        const bTime = new Date(b.firstTs).getTime()
        return attribution === 'first' ? aTime - bTime : bTime - aTime
      })

      // Шаг 3: Перебираем сессии и ищем первую с UTM-метками
      for (const session of allSessions) {
        // Находим первое HTTP-событие этой сессии
        const firstHttpQuery = `
        SELECT url, ts
        FROM chatium_ai.access_log
        WHERE session_id = '${session.sessionId.replace(/'/g, "''")}'
          AND startsWith(urlPath, 'http')
          AND dt >= today() - 30
        ORDER BY ts ASC
        LIMIT 1
      `

        const httpResult = await gcQueryAi(ctx, firstHttpQuery)

        if (httpResult.rows && httpResult.rows.length > 0) {
          const firstUrl = httpResult.rows[0].url
          const firstTs = httpResult.rows[0].ts

          // Парсим параметры URL
          const params = parseUrlParams(firstUrl)

          // Если запросили конкретный параметр
          if (param) {
            Debug.info(ctx, `[attribution] найден параметр ${param}=${params[param] || null}`)
            return {
              success: true,
              param: param,
              value: params[param] || null
            }
          }

          // Если есть параметры - возвращаем эту сессию
          if (Object.keys(params).length > 0) {
            Debug.info(ctx, `[attribution] найдены параметры: ${JSON.stringify(params)}`)
            return {
              success: true,
              params: params,
              url: firstUrl,
              sessionId: session.sessionId,
              timestamp: firstTs
            }
          }

          // Если параметров нет и ищем last - продолжаем искать
          if (attribution === 'last') {
            continue
          }

          // Если ищем first - возвращаем даже если параметров нет
          Debug.info(ctx, '[attribution] first touch без UTM параметров')
          return {
            success: true,
            params: params,
            url: firstUrl,
            sessionId: session.sessionId,
            timestamp: firstTs
          }
        }
      }

      // Не нашли сессий с параметрами
      Debug.info(ctx, '[attribution] параметры не найдены')
      return {
        success: true,
        params: {},
        message: 'Параметры не найдены'
      }
    } catch (error: any) {
      Debug.error(
        ctx,
        `[attribution] ошибка (${userId}, ${attribution}): ${error?.message || error}`
      )

      return {
        success: false,
        error: error.message
      }
    }
  })
