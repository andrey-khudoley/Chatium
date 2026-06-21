// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../../lib/settings.lib'
import * as chatsRepo from '../../../repos/maxChats.repo'
import * as runsRepo from '../../../repos/maxHistoryRefreshRuns.repo'
import * as rawRepo from '../../../repos/maxRawUpdates.repo'
import * as miniRepo from '../../../repos/miniappPageEvents.repo'

function configured(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  return (value as { configured?: unknown }).configured === true
}

export const maxControlGetRoute = app.get('/', async (ctx, _req) => {
  requireAccountRole(ctx, 'Admin')
  const settings = await settingsLib.getAllSettings(ctx)
  const rawPending = await rawRepo.findBrokerPublishPending(ctx, { limit: 500 })
  const miniPending = await miniRepo.findBrokerPublishPending(ctx, { limit: 500 })
  const runs = await runsRepo.findRecent(ctx, { limit: 20 })
  return {
    success: true,
    settings,
    status: {
      botTokenConfigured: configured(settings[settingsLib.SETTING_KEYS.MAX_BOT_ACCESS_TOKEN]),
      webhookSecretConfigured: configured(settings[settingsLib.SETTING_KEYS.MAX_WEBHOOK_SECRET]),
      brokerModuleTokenConfigured: configured(
        settings[settingsLib.SETTING_KEYS.CORE_BROKER_MODULE_TOKEN]
      ),
      knownChats: await chatsRepo.countKnown(ctx),
      brokerPending: rawPending.length + miniPending.length,
      latestRuns: runs
    },
    at: Date.now()
  }
})
