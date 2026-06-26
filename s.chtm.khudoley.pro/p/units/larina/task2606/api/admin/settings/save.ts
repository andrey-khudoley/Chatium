// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../../lib/settings.lib'
import { writeServerLog } from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/settings/save'

/**
 * POST / — сохранить настройку.
 */
export const postAdminSettingsSaveRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const body = req.body as { key?: unknown; value?: unknown }
  const key = String(body?.key ?? '').trim()
  const value = body?.value

  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { key, value }
  })

  if (!key) {
    await writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] missing key`
    })
    return { success: false, error: 'Параметр key обязателен' }
  }

  await settingsLib.setSetting(ctx, key, value)
  const updated = await settingsLib.getSetting(ctx, key)

  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { key, updated }
  })

  return { success: true, key, value: updated }
})

export default postAdminSettingsSaveRoute
