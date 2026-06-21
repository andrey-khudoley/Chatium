// @shared-route
import { requireAccountRole } from '@app/auth'
import * as logsRepo from '../../../repos/logs.repo'
import * as loggerLib from '../../../lib/logger.lib'
import type { LogsRow } from '../../../tables/logs.table'

const LOG_PATH = 'api/admin/logs/before'

/**
 * Маппинг строки из Heap в формат LogEntry для клиента
 */
function rowToLogEntry(row: LogsRow) {
  return {
    id: row.id,
    severity: row.severity,
    level: row.level?.toLowerCase() ?? 'info',
    timestamp: row.timestamp,
    args: row.payload != null ? [row.message, row.payload] : [row.message]
  }
}

/**
 * GET /api/admin/logs/before?beforeTimestamp=xxx&limit=50 — получить N логов старше указанного timestamp.
 * Только Admin.
 */
export const getLogsBeforeRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос логов до указанного timestamp`,
    payload: { queryKeys: Object.keys(req.query ?? {}) }
  })

  const beforeTimestampRaw = req.query.beforeTimestamp as string
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Парсинг query`,
    payload: { beforeTimestampRaw, queryKeys: Object.keys(req.query ?? {}) }
  })
  if (!beforeTimestampRaw || typeof beforeTimestampRaw !== 'string' || !beforeTimestampRaw.trim()) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Валидация не пройдена: отсутствует или пустой beforeTimestamp`,
      payload: { query: req.query }
    })
    return { success: false, error: 'Параметр beforeTimestamp обязателен' }
  }

  const beforeTimestamp = Number(beforeTimestampRaw)
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Переменные после парсинга timestamp`,
    payload: { beforeTimestampRaw, beforeTimestamp }
  })
  if (isNaN(beforeTimestamp) || beforeTimestamp <= 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Валидация не пройдена: некорректный beforeTimestamp`,
      payload: { query: req.query, beforeTimestampRaw }
    })
    return { success: false, error: 'Параметр beforeTimestamp должен быть положительным числом' }
  }

  const limitRaw = req.query.limit as string | undefined
  const limit = Math.min(Math.max(1, Number(limitRaw) || 50), 200)
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Парсинг limit`,
    payload: { limitRaw, limit }
  })

  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Вызов logsRepo.findBeforeTimestamp`,
      payload: { beforeTimestamp, limit }
    })
    const logs = await logsRepo.findBeforeTimestamp(ctx, beforeTimestamp, limit)
    const entries = logs.map(rowToLogEntry)
    const hasMore = entries.length === limit
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Переменные после findBeforeTimestamp`,
      payload: { logsCount: logs.length, entriesCount: entries.length, hasMore }
    })

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Логи получены`,
      payload: { count: entries.length, limit, hasMore, beforeTimestamp }
    })

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Возврат success`,
      payload: { entriesCount: entries.length, hasMore }
    })
    return { success: true, entries, hasMore }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка получения логов`,
      payload: { error: String(error), beforeTimestamp }
    })
    return { success: false, error: String(error) }
  }
})
