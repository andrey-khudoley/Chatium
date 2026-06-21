// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as webhookSecret from '../../../lib/webhookSecret.lib'

const LOG_PATH = 'api/admin/webhook/info'

/**
 * GET /api/admin/webhook/info — текущий токен webhook'а и сборка URL.
 * Только Admin. Токен выводится целиком, чтобы админ мог скопировать его в GC.
 *
 * Ответ:
 * - `token`: текущая строка токена;
 * - `webhookUrlSuffix`: путь относительно корня приложения (`/api/webhook?token=...`);
 *   полный URL формируется на стороне UI/админа добавлением домена и PROJECT_ROOT.
 */
export const getWebhookInfoRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: {}
  })

  const token = await webhookSecret.ensureWebhookToken(ctx)
  const suffix = `/api/webhook?token=${token}`

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { tokenLength: token.length }
  })

  return { success: true, token, webhookUrlSuffix: suffix }
})
