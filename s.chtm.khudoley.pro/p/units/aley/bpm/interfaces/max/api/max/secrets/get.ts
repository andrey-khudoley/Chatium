// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../../lib/settings.lib'

async function configured(ctx: app.Ctx, key: string): Promise<boolean> {
  return (await settingsLib.getRawSecretSettingString(ctx, key)).trim().length > 0
}

export const maxSecretsGetRoute = app.get('/', async (ctx, _req) => {
  requireAccountRole(ctx, 'Admin')
  return {
    success: true,
    botTokenConfigured: await configured(ctx, settingsLib.SETTING_KEYS.MAX_BOT_ACCESS_TOKEN),
    webhookSecretConfigured: await configured(ctx, settingsLib.SETTING_KEYS.MAX_WEBHOOK_SECRET),
    brokerModuleTokenConfigured: await configured(
      ctx,
      settingsLib.SETTING_KEYS.CORE_BROKER_MODULE_TOKEN
    )
  }
})
