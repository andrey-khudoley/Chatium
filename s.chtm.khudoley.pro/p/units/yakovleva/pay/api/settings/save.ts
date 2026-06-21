// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../lib/settings.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/settings/save'

/** Маскировка секретных значений перед логированием. Зеркало lib/settings.lib.ts setSetting exit. */
function maskValueForLog(key: string, value: unknown): unknown {
  if (
    key === settingsLib.SETTING_KEYS.LP_APIKEY ||
    key === settingsLib.SETTING_KEYS.LP_WEBHOOK_TOKEN ||
    key === settingsLib.SETTING_KEYS.LAVA_TEST_APIKEY ||
    key === settingsLib.SETTING_KEYS.LAVA_WEBHOOK_SECRET ||
    key === settingsLib.SETTING_KEYS.GC_TEST_SCHOOL_API_KEY
  ) {
    return typeof value === 'string' && value.length > 0 ? '***' : value
  }
  if (
    key === settingsLib.SETTING_KEYS.LP_LOGIN &&
    typeof value === 'string' &&
    value.length === 11
  ) {
    return `+${value.slice(0, 4)}***${value.slice(-4)}`
  }
  return value
}

/** Маппинг числовых уровней: -1 = логи выключены, 0 = Disable, 1 = Info, 2 = Warn, 3 = Error, 4 = Debug. */
const LOG_LEVEL_BY_NUMBER: Record<number, string> = {
  [-1]: 'Disable',
  0: 'Disable',
  1: 'Info',
  2: 'Warn',
  3: 'Error',
  4: 'Debug'
}

/** Нормализация значения уровня логирования для lib (Debug | Info | Warn | Error | Disable). Числа -1–4 и строки. */
function normalizeLogLevelValue(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value) && value in LOG_LEVEL_BY_NUMBER) {
    return LOG_LEVEL_BY_NUMBER[value] ?? 'Info'
  }
  const s = typeof value === 'string' ? value.trim().toLowerCase() : String(value).toLowerCase()
  if (!s) return 'Info'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * POST /api/settings/save — сохранить настройку.
 * Body: { key: string, value: unknown }
 * Только Admin.
 */
export const saveSettingRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Получен запрос на сохранение настройки`,
    payload: { bodyKeys: req.body ? Object.keys(req.body as object) : [] }
  })

  const body = req.body as { key?: unknown; value?: unknown }
  const key = typeof body?.key === 'string' ? body.key.trim() : ''
  let value = body?.value

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Парсинг body`,
    payload: { key, value: maskValueForLog(key, value), bodyKeys: body ? Object.keys(body) : [] }
  })

  if (!key) {
    const keyRaw = body?.key
    const reason =
      keyRaw === undefined || keyRaw === null
        ? 'missing'
        : typeof keyRaw !== 'string'
          ? 'not_string'
          : 'empty_after_trim'
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Валидация: key не задан или пустая строка`,
      payload: {
        bodyKeys: body ? Object.keys(body) : [],
        reason,
        keyType: typeof keyRaw
      }
    })
    return { success: false, error: 'Поле key обязательно' }
  }

  if (key === settingsLib.SETTING_KEYS.LOG_LEVEL && value !== undefined && value !== null) {
    value = normalizeLogLevelValue(value)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Нормализован log_level`,
      payload: { value }
    })
  }

  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Вызов lib setSetting`,
      payload: { key, value: maskValueForLog(key, value) }
    })
    await settingsLib.setSetting(ctx, key, value)
    const saved = await settingsLib.getSetting(ctx, key)
    const savedMasked = maskValueForLog(key, saved)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Настройка сохранена`,
      payload: { key, value: savedMasked }
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Возврат success`,
      payload: { key, saved: savedMasked }
    })
    return { success: true, key, value: saved }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка сохранения настройки`,
      payload: { key, error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
