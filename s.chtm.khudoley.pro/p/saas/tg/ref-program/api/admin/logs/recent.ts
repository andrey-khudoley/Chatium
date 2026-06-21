// @shared-route
import { requireAccountRole } from '@app/auth'
import * as logsRepo from '../../../repos/logs.repo'
import * as loggerLib from '../../../lib/logger.lib'
import type { LogsRow } from '../../../tables/logs.table'

const LOG_PATH = 'api/admin/logs/recent'

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
 * GET /api/admin/logs/recent?limit=50 — получить последние N логов.
 * Только Admin.
 */
export const getRecentLogsRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос последних логов`,
    payload: { queryKeys: Object.keys(req.query ?? {}) }
  })

  const limitRaw = req.query.limit as string | undefined
  const limit = Math.min(Math.max(1, Number(limitRaw) || 50), 200)

  try {
    const logs = await logsRepo.findAll(ctx, { limit, offset: 0 })
    const entries = logs.map(rowToLogEntry)

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Логи получены`,
      payload: { count: entries.length, limit }
    })

    return { success: true, entries }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка получения логов`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
