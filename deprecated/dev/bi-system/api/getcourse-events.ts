/**
 * Аналитика событий GetCourse из ClickHouse
 *
 * Этот модуль предоставляет API для получения аналитики по событиям GetCourse,
 * которые были записаны в ClickHouse через счётчик трафика.
 *
 * ВАЖНО: Это НЕ API GetCourse, а аналитика событий из ClickHouse через MCP-сервер.
 * Все запросы выполняются к таблице chatium_ai.access_log, где хранятся события
 * с urlPath вида 'event://getcourse/...'
 */

import { requireAnyUser } from '@app/auth'
import { gcQueryAi } from '@gc-mcp-server/sdk'
import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'

// @shared-route
export const apiGetCourseEventsOrdersRoute = app
  .query((s) => ({
    dateFrom: s.string().optional(),
    dateTo: s.string().optional(),
    limit: s.number().default(100),
    offset: s.number().default(0)
  }))
  .get('/orders', async (ctx, req) => {
    requireAnyUser(ctx)
    await applyDebugLevel(ctx, 'getcourse-events:orders')

    const { dateFrom, dateTo, limit, offset } = req.query

    try {
      Debug.info(
        ctx,
        `[getcourse-events:orders] чтение событий заказов из ClickHouse (limit=${limit}, offset=${offset}, from=${dateFrom || '-'}, to=${dateTo || '-'})`
      )
      // Получаем данные о заказах из событий GetCourse в ClickHouse
      const query = `
      SELECT 
        action_param1 as deal_id,
        action_param3_int as order_number,
        action_param1_float as amount,
        action_param2 as currency,
        action_param3 as status,
        title as offer_name,
        user_id,
        user_email,
        user_first_name,
        user_last_name,
        dt as created_date,
        ts as created_time
      FROM chatium_ai.access_log
      WHERE urlPath = 'event://getcourse/dealCreated'
        ${dateFrom ? `AND dt >= '${dateFrom}'` : ''}
        ${dateTo ? `AND dt <= '${dateTo}'` : ''}
      ORDER BY ts DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

      const result = await gcQueryAi(ctx, query)
      const rows = result.rows || []

      Debug.info(ctx, `[getcourse-events:orders] получено ${rows.length} строк из ClickHouse`)

      return {
        success: true,
        orders: rows,
        total: rows.length
      }
    } catch (error: any) {
      Debug.error(
        ctx,
        `[getcourse-events:orders] ошибка запроса к ClickHouse: ${error?.message || error}`
      )
      return { success: false, error: error.message, orders: [], total: 0 }
    }
  })

// @shared-route
export const apiGetCourseEventsOrdersStatsRoute = app
  .query((s) => ({
    dateFrom: s.string().optional(),
    dateTo: s.string().optional()
  }))
  .get('/orders-stats', async (ctx, req) => {
    requireAnyUser(ctx)
    await applyDebugLevel(ctx, 'getcourse-events:orders-stats')

    const { dateFrom, dateTo } = req.query

    try {
      Debug.info(
        ctx,
        `[getcourse-events:orders-stats] расчёт статистики из событий ClickHouse (from=${dateFrom || '-'}, to=${dateTo || '-'})`
      )
      const query = `
      WITH created_deals AS (
        SELECT 
          COUNT(DISTINCT action_param1) as count,
          SUM(action_param1_float) as amount
        FROM chatium_ai.access_log
        WHERE urlPath = 'event://getcourse/dealCreated'
          ${dateFrom ? `AND dt >= '${dateFrom}'` : ''}
          ${dateTo ? `AND dt <= '${dateTo}'` : ''}
      ),
      paid_deals AS (
        SELECT 
          COUNT(DISTINCT action_param1) as count,
          SUM(action_param2_float) as amount
        FROM chatium_ai.access_log
        WHERE urlPath = 'event://getcourse/dealPaid'
          ${dateFrom ? `AND dt >= '${dateFrom}'` : ''}
          ${dateTo ? `AND dt <= '${dateTo}'` : ''}
      )
      SELECT 
        c.count as total_orders,
        c.amount as total_amount,
        p.count as paid_orders,
        p.amount as paid_amount,
        ROUND((p.count * 100.0 / GREATEST(c.count, 1)), 2) as conversion
      FROM created_deals c, paid_deals p
    `

      const result = await gcQueryAi(ctx, query)
      const stats = result.rows?.[0]
      Debug.info(ctx, '[getcourse-events:orders-stats] статистика рассчитана из ClickHouse')

      return {
        success: true,
        stats: {
          totalOrders: stats?.total_orders || 0,
          totalAmount: stats?.total_amount || 0,
          paidOrders: stats?.paid_orders || 0,
          paidAmount: stats?.paid_amount || 0,
          conversion: stats?.conversion || 0
        }
      }
    } catch (error: any) {
      Debug.error(
        ctx,
        `[getcourse-events:orders-stats] ошибка запроса к ClickHouse: ${error?.message || error}`
      )
      return { success: false, error: error.message }
    }
  })

// @shared-route
export const apiGetCourseEventsUsersRoute = app
  .query((s) => ({
    dateFrom: s.string().optional(),
    dateTo: s.string().optional()
  }))
  .get('/users', async (ctx, req) => {
    requireAnyUser(ctx)
    await applyDebugLevel(ctx, 'getcourse-events:users')

    const { dateFrom, dateTo } = req.query

    try {
      Debug.info(
        ctx,
        `[getcourse-events:users] загрузка событий регистрации из ClickHouse (from=${dateFrom || '-'}, to=${dateTo || '-'})`
      )
      const query = `
      SELECT 
        dt as registration_date,
        COUNT(DISTINCT user_id) as new_users
      FROM chatium_ai.access_log
      WHERE urlPath = 'event://getcourse/user/created'
        ${dateFrom ? `AND dt >= '${dateFrom}'` : ''}
        ${dateTo ? `AND dt <= '${dateTo}'` : ''}
      GROUP BY dt
      ORDER BY dt DESC
    `

      const result = await gcQueryAi(ctx, query)
      const rows = result.rows || []
      Debug.info(ctx, `[getcourse-events:users] найдено ${rows.length} записей в ClickHouse`)

      return {
        success: true,
        users: rows
      }
    } catch (error: any) {
      Debug.error(
        ctx,
        `[getcourse-events:users] ошибка запроса к ClickHouse: ${error?.message || error}`
      )
      return { success: false, error: error.message, users: [] }
    }
  })

// @shared-route
export const apiGetCourseEventsTelegramUsersRoute = app
  .query((s) => ({
    dateFrom: s.string().optional(),
    dateTo: s.string().optional()
  }))
  .get('/telegram-users', async (ctx, req) => {
    requireAnyUser(ctx)
    await applyDebugLevel(ctx, 'getcourse-events:telegram-users')

    const { dateFrom, dateTo } = req.query

    try {
      Debug.info(
        ctx,
        `[getcourse-events:telegram-users] расчёт статистики Telegram из событий ClickHouse (from=${dateFrom || '-'}, to=${dateTo || '-'})`
      )
      const query = `
      WITH all_users AS (
        SELECT DISTINCT user_id
        FROM chatium_ai.access_log
        WHERE urlPath = 'event://getcourse/user/created'
          ${dateFrom ? `AND dt >= '${dateFrom}'` : ''}
          ${dateTo ? `AND dt <= '${dateTo}'` : ''}
      ),
      telegram_enabled AS (
        SELECT DISTINCT user_id
        FROM chatium_ai.access_log
        WHERE urlPath = 'event://getcourse/user/chatbot/telegram_enabled'
          ${dateFrom ? `AND dt >= '${dateFrom}'` : ''}
          ${dateTo ? `AND dt <= '${dateTo}'` : ''}
      ),
      telegram_disabled AS (
        SELECT DISTINCT user_id
        FROM chatium_ai.access_log
        WHERE urlPath = 'event://getcourse/user/chatbot/telegram_disabled'
          ${dateFrom ? `AND dt >= '${dateFrom}'` : ''}
          ${dateTo ? `AND dt <= '${dateTo}'` : ''}
      )
      SELECT 
        COUNT(DISTINCT au.user_id) as total_users,
        COUNT(DISTINCT te.user_id) as telegram_connected,
        COUNT(DISTINCT td.user_id) as telegram_disconnected,
        COUNT(DISTINCT te.user_id) - COUNT(DISTINCT td.user_id) as active_telegram
      FROM all_users au
      LEFT JOIN telegram_enabled te ON au.user_id = te.user_id
      LEFT JOIN telegram_disabled td ON au.user_id = td.user_id
    `

      const result = await gcQueryAi(ctx, query)
      const stats = result.rows?.[0]
      Debug.info(ctx, '[getcourse-events:telegram-users] статистика собрана из ClickHouse')

      return {
        success: true,
        stats: {
          totalUsers: stats?.total_users || 0,
          telegramConnected: stats?.telegram_connected || 0,
          telegramDisconnected: stats?.telegram_disconnected || 0,
          activeTelegram: stats?.active_telegram || 0
        }
      }
    } catch (error: any) {
      Debug.error(
        ctx,
        `[getcourse-events:telegram-users] ошибка запроса к ClickHouse: ${error?.message || error}`
      )
      return { success: false, error: error.message }
    }
  })

// @shared-route
export const apiGetCourseEventsPaymentsByDateRoute = app
  .query((s) => ({
    dateFrom: s.string().optional(),
    dateTo: s.string().optional()
  }))
  .get('/payments-by-date', async (ctx, req) => {
    requireAnyUser(ctx)
    await applyDebugLevel(ctx, 'getcourse-events:payments-by-date')

    const { dateFrom, dateTo } = req.query

    try {
      Debug.info(
        ctx,
        `[getcourse-events:payments] загрузка событий платежей из ClickHouse (from=${dateFrom || '-'}, to=${dateTo || '-'})`
      )
      const query = `
      SELECT 
        toDate(dt) as payment_date,
        COUNT(DISTINCT action_param1) as orders_paid,
        SUM(action_param2_float) as total_revenue,
        AVG(action_param2_float) as average_payment
      FROM chatium_ai.access_log
      WHERE urlPath = 'event://getcourse/dealPaid'
        ${dateFrom ? `AND dt >= '${dateFrom}'` : ''}
        ${dateTo ? `AND dt <= '${dateTo}'` : ''}
      GROUP BY payment_date
      ORDER BY payment_date DESC
    `

      const result = await gcQueryAi(ctx, query)
      const rows = result.rows || []
      Debug.info(ctx, `[getcourse-events:payments] получено ${rows.length} записей из ClickHouse`)

      return {
        success: true,
        payments: rows
      }
    } catch (error: any) {
      Debug.error(
        ctx,
        `[getcourse-events:payments] ошибка запроса к ClickHouse: ${error?.message || error}`
      )
      return { success: false, error: error.message, payments: [] }
    }
  })

// @shared-route
export const apiGetCourseEventsGroupsRoute = app
  .query((s) => ({
    dateFrom: s.string().optional(),
    dateTo: s.string().optional(),
    limit: s.number().default(20)
  }))
  .get('/groups', async (ctx, req) => {
    requireAnyUser(ctx)
    await applyDebugLevel(ctx, 'getcourse-events:groups')

    const { dateFrom, dateTo, limit } = req.query

    try {
      Debug.info(
        ctx,
        `[getcourse-events:groups] чтение событий групп из ClickHouse (limit=${limit}, from=${dateFrom || '-'}, to=${dateTo || '-'})`
      )
      const query = `
      SELECT 
        action_param1 as group_id,
        COUNT(DISTINCT user_id) as members_count
      FROM chatium_ai.access_log
      WHERE urlPath = 'event://getcourse/user/group_added'
        ${dateFrom ? `AND dt >= '${dateFrom}'` : ''}
        ${dateTo ? `AND dt <= '${dateTo}'` : ''}
      GROUP BY group_id
      ORDER BY members_count DESC
      LIMIT ${limit}
    `

      const result = await gcQueryAi(ctx, query)
      const rows = result.rows || []
      Debug.info(ctx, `[getcourse-events:groups] найдено ${rows.length} групп в ClickHouse`)

      return {
        success: true,
        groups: rows
      }
    } catch (error: any) {
      Debug.error(
        ctx,
        `[getcourse-events:groups] ошибка запроса к ClickHouse: ${error?.message || error}`
      )
      return { success: false, error: error.message, groups: [] }
    }
  })
