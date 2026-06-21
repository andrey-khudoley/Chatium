// @shared-route
import * as settingsLib from '../../lib/settings.lib'
import * as loggerLib from '../../lib/logger.lib'
import { acceptMaxUpdate } from '../../lib/maxRawUpdates.lib'

const LOG_PATH = 'api/max/webhook'

function headerValue(headers: Record<string, unknown>, key: string): string {
  const raw = headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()]
  if (Array.isArray(raw)) return String(raw[0] ?? '')
  return typeof raw === 'string' ? raw : raw == null ? '' : String(raw)
}

export const maxWebhookRoute = app.post('/', async (ctx, req) => {
  const expectedSecret = await settingsLib.getRawSecretSettingString(
    ctx,
    settingsLib.SETTING_KEYS.MAX_WEBHOOK_SECRET
  )
  if (!expectedSecret) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] MAX webhook secret is not configured`,
      payload: { reason: 'missing_webhook_secret' }
    })
    return { success: false, error: 'MAX webhook secret is not configured' }
  }
  const receivedSecret = headerValue(req.headers as Record<string, unknown>, 'x-max-bot-api-secret')
  if (!receivedSecret || receivedSecret !== expectedSecret) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Invalid MAX webhook secret`,
      payload: { reason: 'invalid_webhook_secret', hasReceivedSecret: !!receivedSecret }
    })
    return { success: false, error: 'Invalid MAX webhook secret' }
  }
  try {
    const update: unknown = req.body
    const accepted = await acceptMaxUpdate(ctx, { source: 'webhook', update })
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] MAX update accepted: ${accepted.row.updateType}`,
      payload: {
        id: accepted.row.id,
        updateType: accepted.row.updateType,
        skipped: accepted.skipped,
        brokerPublishStatus: accepted.row.brokerPublishStatus
      }
    })
    return {
      success: true,
      id: accepted.row.id,
      receivedAt: accepted.row.receivedAt,
      brokerPublishStatus: accepted.row.brokerPublishStatus
    }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] MAX webhook failed`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
