// @shared-route
/**
 * Deprecated widget settings write endpoint.
 *
 * Old widget settings were replaced by manifest-driven payment plugins. The
 * route is kept only for compatibility with stale clients, requires Admin, logs
 * usage and fails closed without writing settings.
 */

import * as loggerLib from '../../lib/logger.lib'
import { requireAccountRole } from '@app/auth'

const LOG_PATH = 'api/widgets/settings-save'

export const widgetSettingsSaveRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const body = req.body as { key?: unknown; value?: unknown }
  const key = typeof body?.key === 'string' ? body.key.trim() : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 4,
    message: `[${LOG_PATH}] deprecated`,
    payload: { key }
  })

  return { success: false, error: 'WIDGET_SETTINGS_DEPRECATED' }
})

export default widgetSettingsSaveRoute
