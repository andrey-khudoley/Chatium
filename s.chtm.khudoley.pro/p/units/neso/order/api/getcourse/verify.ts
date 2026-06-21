// @shared-route
import { requireAccountRole } from '@app/auth'
import * as gcLib from '../../lib/getcourse.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/getcourse/verify'

/**
 * POST /api/getcourse/verify — проверка ключа API и домена GetCourse.
 * Body: { domain: string, apiKey: string }
 * Только Admin.
 */
export const verifyGcRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const body = req.body as Record<string, unknown>
  const domain = typeof body.domain === 'string' ? body.domain.trim() : ''
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки подключения`,
    payload: { hasDomain: Boolean(domain), hasKey: Boolean(apiKey) }
  })

  const result = await gcLib.verifyGcAccess(ctx, { apiKey, domain })

  await loggerLib.writeServerLog(ctx, {
    severity: result.ok ? 6 : 4,
    message: `[${LOG_PATH}] Результат проверки`,
    payload: { ok: result.ok, message: result.message }
  })

  return { success: result.ok, message: result.message }
})
