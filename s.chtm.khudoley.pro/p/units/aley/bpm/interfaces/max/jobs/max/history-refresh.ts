import { runHistoryRefreshIteration } from '../../lib/maxHistory.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'jobs/max/history-refresh'

export const maxHistoryRefreshJob = app.job('/max/history-refresh', async (ctx, _params: {}) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Run MAX history refresh iteration`,
    payload: {}
  })
  const result = await runHistoryRefreshIteration(ctx)
  if (result.reschedule) await maxHistoryRefreshJob.scheduleJobAsap(ctx, {})
  return result
})
