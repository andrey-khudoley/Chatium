// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../../lib/settings.lib'
import { applyMaxSubscription } from '../../../lib/max/apiClient.lib'
import { getFullUrl } from '../../../config/routes'
import { maxWebhookRoute } from '../webhook'

function effectiveWebhookUrl(req: app.Req): string {
  const headers = (req.headers ?? {}) as Record<string, string | undefined>
  const proto = headers['x-forwarded-proto'] ?? 'https'
  const host = headers.host ?? headers.Host ?? ''
  return `${proto}://${host}${getFullUrl(maxWebhookRoute.url())}`
}

export const maxSubscriptionApplyRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const secret = await settingsLib.getRawSecretSettingString(
    ctx,
    settingsLib.SETTING_KEYS.MAX_WEBHOOK_SECRET
  )
  if (!secret) return { success: false, error: 'MAX webhook secret is not configured' }
  const types = (await settingsLib.getSetting(
    ctx,
    settingsLib.SETTING_KEYS.MAX_UPDATE_TYPES
  )) as string[]
  const url = effectiveWebhookUrl(req)
  await applyMaxSubscription(ctx, url, secret, Array.isArray(types) ? types : [])
  await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.MAX_RECEIVE_MODE, 'webhook')
  return { success: true, effectiveWebhookUrl: url }
})
