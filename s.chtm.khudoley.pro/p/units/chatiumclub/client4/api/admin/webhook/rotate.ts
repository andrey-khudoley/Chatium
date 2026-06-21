// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as webhookSecret from '../../../lib/webhookSecret.lib'

const LOG_PATH = 'api/admin/webhook/rotate'

/**
 * POST /api/admin/webhook/rotate — принудительно сгенерировать новый webhook-токен.
 * Только Admin. После ротации старый URL перестаёт работать; администратор должен
 * обновить URL в админке GC.
 */
export const rotateWebhookRoute = app.post('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: {}
  })

  const newToken = await webhookSecret.rotateWebhookToken(ctx)
  const suffix = `/api/webhook?token=${newToken}`

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { tokenLength: newToken.length }
  })

  return { success: true, token: newToken, webhookUrlSuffix: suffix }
})
