// @shared-route
import * as spinsRepo from '../../repos/spins.repo'
import * as wheelLib from '../../lib/wheel.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/wheel/winners'

/**
 * GET /api/wheel/winners — публичный список последних побед с маскированным email.
 * Guest (без auth). Query: limit? (1..200, default 50), offset? (≥0, default 0).
 * Ответ: { success:true, winners: WinnerRow[], hasMore:boolean }
 * WinnerRow: { emailMasked: string, prize: string, timestamp: number }
 * Полный email НЕ передаётся клиенту — маскируется на сервере (§11.5, §16.10).
 */
export const wheelWinnersRoute = app.get('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос списка победителей`,
    payload: {}
  })

  try {
    const query = req.query as { limit?: unknown; offset?: unknown }

    const rawLimit = parseInt(String(query.limit ?? ''), 10)
    const limit = isNaN(rawLimit) ? 50 : Math.min(200, Math.max(1, rawLimit))

    const rawOffset = parseInt(String(query.offset ?? ''), 10)
    const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Параметры запроса`,
      payload: { limit, offset }
    })

    const rows = await spinsRepo.findRecent(ctx, limit, offset)

    // Маскируем email каждой строки — полный email не попадает в ответ (§11.5, §16.10)
    const winners = rows.map((row) => ({
      emailMasked: wheelLib.maskEmail(row.email),
      prize: row.prize,
      timestamp: row.timestamp
    }))

    const hasMore = rows.length === limit

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Список победителей получен`,
      payload: { count: winners.length, hasMore }
    })

    return { success: true, winners, hasMore }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Необработанная ошибка`,
      payload: { error: String(error) }
    })
    // PII-безопасный catch: только success/error, без данных (§11.5)
    return { success: false, error: String(error) }
  }
})
