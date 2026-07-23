// @shared-route
import { requireAccountRole } from '@app/auth'
import { readLogs } from '../../../lib/log/read-logs'
import type { LogLevel } from '../../../lib/log/logger'

// Единственный источник допустимых значений levels (зеркалит тип LogLevel,
// logger.ts) — тело роута видит string[], без рантайм-проверки невалидное
// значение молча уходило бы в SQL IN(...) внутри readLogs (фикс-цикл волны 2.5).
const VALID_LOG_LEVELS: readonly LogLevel[] = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'unknown'
]

const LIMIT_DEFAULT = 50
const LIMIT_MAX = 200

/** Admin-only чтение истории логов (§5.11 п.1, §5.10.7) — список без payload (тянется отдельно, log-payload.ts). */
export const brokerAdminLogsRoute = app
  .post('/')
  .body((s) => ({
    levels: s.array(s.string()).optional(),
    search: s.string().optional(),
    from: s.string().optional(),
    to: s.string().optional(),
    limit: s.number().optional(),
    offset: s.number().optional()
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    if (req.body.levels) {
      const invalid = req.body.levels.filter(
        (l) => !(VALID_LOG_LEVELS as readonly string[]).includes(l)
      )
      if (invalid.length > 0) {
        return {
          success: false,
          error: `Недопустимые значения levels: ${invalid.join(', ')}, ожидается один из: ${VALID_LOG_LEVELS.join(', ')}`
        }
      }
    }

    let from: Date | undefined
    if (req.body.from !== undefined) {
      const parsed = new Date(req.body.from)
      if (isNaN(parsed.getTime())) {
        return { success: false, error: `Недопустимая дата from: "${req.body.from}"` }
      }
      from = parsed
    }

    let to: Date | undefined
    if (req.body.to !== undefined) {
      const parsed = new Date(req.body.to)
      if (isNaN(parsed.getTime())) {
        return { success: false, error: `Недопустимая дата to: "${req.body.to}"` }
      }
      to = parsed
    }

    const limit = Math.max(1, Math.min(req.body.limit ?? LIMIT_DEFAULT, LIMIT_MAX))
    const offset = Math.max(0, req.body.offset ?? 0)

    const { rows, total } = await readLogs(ctx, {
      levels: req.body.levels as LogLevel[] | undefined,
      search: req.body.search,
      from,
      to,
      limit,
      offset
    })
    return { success: true, rows, total }
  })
