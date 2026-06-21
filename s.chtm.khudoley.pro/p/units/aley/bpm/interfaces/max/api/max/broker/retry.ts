// @shared-route
import { requireAccountRole } from '@app/auth'
import { runWithExclusiveLock } from '@app/sync'
import * as rawRepo from '../../../repos/maxRawUpdates.repo'
import * as miniRepo from '../../../repos/miniappPageEvents.repo'
import { retryMaxRawBrokerPublish } from '../../../lib/maxRawUpdates.lib'
import { retryMiniappBrokerPublish } from '../../../lib/miniappPageEvents.lib'

export const maxBrokerRetryRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  return runWithExclusiveLock(ctx, 'max:broker:retry', async () => {
    const body = (req.body ?? {}) as { source?: string; limit?: number }
    const source = body.source || 'all'
    const limit = Math.max(1, Math.min(100, Math.floor(Number(body.limit) || 50)))
    let retried = 0
    let published = 0
    let failed = 0
    if (source === 'all' || source === 'max_raw_update') {
      const rows = await rawRepo.findBrokerPublishPending(ctx, { limit })
      const result = await retryMaxRawBrokerPublish(ctx, rows)
      retried += rows.length
      published += result.published
      failed += result.failed
    }
    if (source === 'all' || source === 'miniapp_page_event') {
      const rows = await miniRepo.findBrokerPublishPending(ctx, { limit })
      const result = await retryMiniappBrokerPublish(ctx, rows)
      retried += rows.length
      published += result.published
      failed += result.failed
    }
    return { success: true, retried, published, failed, skipped: 0 }
  })
})
