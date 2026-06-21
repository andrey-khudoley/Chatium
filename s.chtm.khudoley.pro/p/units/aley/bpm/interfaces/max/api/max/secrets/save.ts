// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../../lib/settings.lib'

function configured(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  return (value as { configured?: unknown }).configured === true
}

export const maxSecretsSaveRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const body = (req.body ?? {}) as Record<string, unknown>
  if (body.clearBotAccessToken === true) {
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.MAX_BOT_ACCESS_TOKEN, '')
  } else if (typeof body.botAccessToken === 'string') {
    await settingsLib.setSetting(
      ctx,
      settingsLib.SETTING_KEYS.MAX_BOT_ACCESS_TOKEN,
      body.botAccessToken
    )
  }
  if (body.clearWebhookSecret === true) {
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.MAX_WEBHOOK_SECRET, '')
  } else if (typeof body.webhookSecret === 'string') {
    await settingsLib.setSetting(
      ctx,
      settingsLib.SETTING_KEYS.MAX_WEBHOOK_SECRET,
      body.webhookSecret
    )
  }
  if (body.clearBrokerModuleToken === true) {
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.CORE_BROKER_MODULE_TOKEN, '')
  } else if (typeof body.brokerModuleToken === 'string') {
    await settingsLib.setSetting(
      ctx,
      settingsLib.SETTING_KEYS.CORE_BROKER_MODULE_TOKEN,
      body.brokerModuleToken
    )
  }
  const settings = await settingsLib.getAllSettings(ctx)
  return {
    success: true,
    botTokenConfigured: configured(settings[settingsLib.SETTING_KEYS.MAX_BOT_ACCESS_TOKEN]),
    webhookSecretConfigured: configured(settings[settingsLib.SETTING_KEYS.MAX_WEBHOOK_SECRET]),
    brokerModuleTokenConfigured: configured(
      settings[settingsLib.SETTING_KEYS.CORE_BROKER_MODULE_TOKEN]
    )
  }
})
