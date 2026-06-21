// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'
import { importPortableSettings } from '../../lib/settingsBackup.lib'

const LOG_PATH = 'api/settings/import'

/**
 * POST /api/settings/import — импорт JSON-структуры, созданной settings/export.
 * Body: { backup: PortableSettingsBackup }
 * Только Admin.
 */
export const settingsImportRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const body = req.body as { backup?: unknown } | null
  const backup = body && typeof body === 'object' && 'backup' in body ? body.backup : req.body

  try {
    const result = await importPortableSettings(ctx, backup)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] success`,
      payload: result
    })
    return { success: true, ...result }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] error`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})

export default settingsImportRoute
