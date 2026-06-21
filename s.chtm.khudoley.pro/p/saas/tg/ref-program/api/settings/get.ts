// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../lib/settings.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/settings/get'

/**
 * GET /api/settings/get?key= — получить одну настройку.
 * Только Admin.
 */
export const getSettingRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Получен запрос на чтение настройки`,
    payload: { queryKeys: Object.keys(req.query ?? {}) }
  })

  const key = req.query.key as string
  if (!key || typeof key !== 'string' || !key.trim()) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Валидация не пройдена: отсутствует или пустой key`,
      payload: { query: req.query }
    })
    return { success: false, error: 'Параметр key обязателен' }
  }

  const keyTrimmed = key.trim()
  try {
    const value = await settingsLib.getSetting(ctx, keyTrimmed)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Настройка получена`,
      payload: { key: keyTrimmed, hasValue: value !== undefined && value !== null }
    })
    return { success: true, key: keyTrimmed, value }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка получения настройки`,
      payload: { key: keyTrimmed, error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
