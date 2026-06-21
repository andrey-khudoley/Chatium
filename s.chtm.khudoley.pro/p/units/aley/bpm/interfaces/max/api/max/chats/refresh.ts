// @shared-route
import { requireAccountRole } from '@app/auth'
import {
  createHistoryRefreshRuns,
  type MaxHistoryRefreshCreateResult
} from '../../../lib/maxHistory.lib'
import { maxHistoryRefreshJob } from '../../../jobs/max/history-refresh'

export const maxChatsRefreshRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  try {
    const result = await createHistoryRefreshRuns(
      ctx,
      req.body as { scope?: string; chatId?: string | number; batchSize?: number }
    )
    if (result.success && result.runsCreated > 0) {
      await maxHistoryRefreshJob.scheduleJobAsap(ctx, {})
    }
    return result as MaxHistoryRefreshCreateResult
  } catch (error) {
    return { success: false, error: String(error) }
  }
})
