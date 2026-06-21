// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerSettings from '../../lib/logger-settings.lib'

export const apiLoggingResetMetricsRoute = app.post('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')
  await loggerSettings.resetMetrics(ctx)
  return { success: true }
})
