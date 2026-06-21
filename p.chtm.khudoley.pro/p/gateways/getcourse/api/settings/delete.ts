// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../lib/settings.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/settings/delete'

/**
 * POST /api/settings/delete — удалить запись Heap по ключу (manual §5.9: произвольные пары
 * «ключ — значение»). Только Admin.
 *
 * Body: `{ key: string }`. Ответ: `{ success, key }`.
 */
export const deleteSettingRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { bodyKeys: req.body ? Object.keys(req.body as object) : [] }
  })

  const body = req.body as { key?: unknown }
  const key = typeof body?.key === 'string' ? body.key.trim() : ''

  if (!key) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] validation: empty key`,
      payload: { keyType: typeof body?.key }
    })
    return { success: false, error: 'Поле key обязательно' }
  }

  try {
    await settingsLib.deleteSetting(ctx, key)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] deleted`,
      payload: { key }
    })
    return { success: true, key }
  } catch (error) {
    if (!loggerLib.isServerErrorAlreadyLogged(error)) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] error`,
        payload: { key, error: String(error) }
      })
    }
    return { success: false, error: String(error) }
  }
})
