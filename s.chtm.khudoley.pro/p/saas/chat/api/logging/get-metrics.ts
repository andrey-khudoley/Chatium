// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerSettings from '../../lib/logger-settings.lib'

export const apiLoggingGetMetricsRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')
  const metrics = await loggerSettings.getMetrics(ctx)
  return { metrics }
})
