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

function parseSeveritiesFilter(raw: unknown): number[] | null {
  if (typeof raw !== 'string' || !raw.trim()) return []
  const values = raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n))
  const unique = Array.from(new Set(values))
  if (!unique.every((n) => n >= 0 && n <= 7)) return null
  return unique
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
  const severitiesRaw = req.query.severities
  const severities = parseSeveritiesFilter(severitiesRaw)
  if (severities === null) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Валидация не пройдена: некорректный severities`,
      payload: { severitiesRaw }
    })
    return {
      success: false,
      error: 'Параметр severities должен содержать числа 0..7 через запятую'
    }
  }
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Парсинг query`,
    payload: { limitRaw, limit, severitiesRaw, severities, queryKeys: Object.keys(req.query ?? {}) }
  })

  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Вызов logsRepo.findAll`,
      payload: { limit, offset: 0, severities }
    })
    const logs = await logsRepo.findAll(ctx, { limit, offset: 0, severities })
    const entries = logs.map(rowToLogEntry)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Переменные после findAll`,
      payload: { logsCount: logs.length, entriesCount: entries.length }
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Логи получены`,
      payload: { count: entries.length, limit }
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Возврат success`,
      payload: { entriesCount: entries.length }
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
