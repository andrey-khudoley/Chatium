// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/logger/log'

/**
 * POST /api/logger/log — записать серверный лог.
 * Body: { message (обязательно), severity? (0–7, по умолчанию 6), payload? (JSON с контекстом) }.
 * timestamp и уровень (level) вычисляются в lib; имя модуля при необходимости указывается в тексте message.
 * Только для авторизованных пользователей.
 *
 * Пример: { "message": "[/p/units/larina/wheel/lib] Не удалось загрузить настройки", "severity": 3, "payload": { "key": "log_level" } }
 */
export const logRoute = app.post('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Получен запрос на запись лога`,
    payload: { bodyKeys: req.body ? Object.keys(req.body as object) : [] }
  })

  const body = req.body as { severity?: unknown; message?: unknown; payload?: unknown }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Парсинг body`,
    payload: { bodyKeys: body ? Object.keys(body) : [], body }
  })

  const severity =
    typeof body?.severity === 'number' && Number.isFinite(body.severity)
      ? Math.max(0, Math.min(7, Math.floor(body.severity)))
      : 6
  const message =
    typeof body?.message === 'string' ? body.message.trim() : String(body?.message ?? '')
  const payload = body?.payload

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Переменные после парсинга`,
    payload: { severity, message, hasPayload: payload !== undefined }
  })

  if (!message) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Валидация не пройдена: отсутствует message`,
      payload: { bodyKeys: body ? Object.keys(body) : [] }
    })
    return { success: false, error: 'Поле message обязательно' }
  }

  try {
    await loggerLib.writeServerLog(ctx, { severity, message, payload })
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Возврат success`,
      payload: { success: true }
    })
    return { success: true }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка записи лога`,
      payload: { error: String(error), message }
    })
    return { success: false, error: String(error) }
  }
})
