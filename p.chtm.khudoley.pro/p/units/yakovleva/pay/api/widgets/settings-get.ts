// @shared-route
/**
 * Deprecated widget settings read endpoint.
 *
 * Old widget settings were removed from the main settings panel. The route is
 * kept only for compatibility with stale clients, requires Admin, logs usage and
 * fails closed without returning legacy settings.
 */

import * as loggerLib from '../../lib/logger.lib'
import { requireAccountRole } from '@app/auth'

const LOG_PATH = 'api/widgets/settings-get'

export const widgetSettingsGetRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 4,
    message: `[${LOG_PATH}] deprecated`,
    payload: {}
  })

  return { success: false, error: 'WIDGET_SETTINGS_DEPRECATED' }
})

export default widgetSettingsGetRoute
