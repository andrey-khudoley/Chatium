// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'
import { exportPortableSettings } from '../../lib/settingsBackup.lib'

const LOG_PATH = 'api/settings/export'

/**
 * GET /api/settings/export — экспорт переносимых настроек в JSON-структуру.
 * Исключает настройки админской страницы, но включает секреты платежных интеграций.
 * Только Admin.
 */
export const settingsExportRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  try {
    const backup = await exportPortableSettings(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] success`,
      payload: {
        settingsCount: Object.keys(backup.settings).length,
        methodsCount: backup.paymentPageMethods.length
      }
    })
    return { success: true, backup }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] error`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})

export default settingsExportRoute
