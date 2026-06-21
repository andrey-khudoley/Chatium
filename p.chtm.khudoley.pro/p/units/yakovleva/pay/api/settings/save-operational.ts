// @shared-route
/**
 * Deprecated operational settings endpoint.
 *
 * Old GetCourse toggles moved into manifest-driven payment plugins. The route is
 * kept only for compatibility with stale clients, requires Admin, logs usage and
 * fails closed without writing settings.
 */

import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/settings/save-operational'

export const saveOperationalSettingRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const body = req.body as { key?: unknown; value?: unknown }
  const key = typeof body?.key === 'string' ? body.key.trim() : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 4,
    message: `[${LOG_PATH}] deprecated`,
    payload: { key }
  })

  return { success: false, error: 'OPERATIONAL_SETTINGS_DEPRECATED' }
})

export default saveOperationalSettingRoute
