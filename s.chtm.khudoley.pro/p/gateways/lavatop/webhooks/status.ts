/**
 * GET /webhooks/status — проверка доступности webhook relay Lava.Top.
 */

import * as loggerLib from '../lib/logger.lib'
import * as settingsLib from '../lib/settings.lib'

const LOG_PATH = 'webhooks/status'

export const webhookStatusRoute = app.get('/', async (ctx) => {
  const secret = (await settingsLib.getLavaWebhookSecret(ctx)).trim()
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] GET: проверка доступности`,
    payload: { webhookSecretConfigured: secret.length > 0 }
  })
  return {
    ok: true,
    status: 'ready',
    message:
      'Эндпоинт активен. Рабочие уведомления Lava.Top — POST /webhooks с JSON-телом (PurchaseWebhookLog) и заголовком X-Api-Key (или Basic), совпадающим с настройкой lava_webhook_secret.',
    expectedMethod: 'POST',
    webhookSecretConfigured: secret.length > 0
  }
})

export default webhookStatusRoute
