// @shared-route
import { requireAccountRole } from '@app/auth'
import { deleteMaxSubscription } from '../../../lib/max/apiClient.lib'
import { getFullUrl } from '../../../config/routes'
import { maxWebhookRoute } from '../webhook'

function effectiveWebhookUrl(req: app.Req): string {
  const headers = (req.headers ?? {}) as Record<string, string | undefined>
  const proto = headers['x-forwarded-proto'] ?? 'https'
  const host = headers.host ?? headers.Host ?? ''
  return `${proto}://${host}${getFullUrl(maxWebhookRoute.url())}`
}

export const maxSubscriptionDeleteRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const url = effectiveWebhookUrl(req)
  await deleteMaxSubscription(ctx, url)
  return { success: true, effectiveWebhookUrl: url }
})
