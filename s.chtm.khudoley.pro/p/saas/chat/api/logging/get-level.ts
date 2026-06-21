// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerSettings from '../../lib/logger-settings.lib'

export const apiLoggingGetLevelRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')
  const level = await loggerSettings.getLogLevel(ctx)
  return { level }
})
