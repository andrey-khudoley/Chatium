// @shared-route

import { requireRealUser } from '@app/auth'
import {
  persistLogLevel,
  parseDebugLevel,
  getCachedLogLevel,
  applyDebugLevel
} from '../lib/logging'
import { Debug, DebugLevel } from '../shared/debug'

/**
 * GET /api/settings/log-level
 * Получение текущего уровня логирования
 */
export const apiGetLogLevelRoute = app.get('/log-level', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/settings/log-level')
    Debug.info(
      ctx,
      '[api/settings/log-level] Начало обработки запроса на получение уровня логирования'
    )

    requireRealUser(ctx)
    Debug.info(ctx, `[api/settings/log-level] Пользователь авторизован: userId=${ctx.user.id}`)

    // Получаем уровень из кэша
    const level = getCachedLogLevel()
    Debug.info(ctx, `[api/settings/log-level] Текущий уровень логирования: ${level}`)

    return {
      success: true,
      level: level
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/settings/log-level] Ошибка при получении уровня логирования: ${error.message}`,
      'E_GET_LOG_LEVEL'
    )
    Debug.error(ctx, `[api/settings/log-level] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при получении уровня логирования'
    }
  }
})

/**
 * POST /api/settings/log-level
 * Сохранение уровня логирования
 */
export const apiSaveLogLevelRoute = app.post('/log-level', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/settings/log-level')
    Debug.info(
      ctx,
      '[api/settings/log-level] Начало обработки запроса на сохранение уровня логирования'
    )

    requireRealUser(ctx)
    Debug.info(ctx, `[api/settings/log-level] Пользователь авторизован: userId=${ctx.user.id}`)

    // Проверяем наличие body перед деструктуризацией
    if (!req.body || typeof req.body !== 'object') {
      Debug.warn(ctx, '[api/settings/log-level] Тело запроса отсутствует или имеет неверный тип')
      return {
        success: false,
        error: 'Тело запроса отсутствует или имеет неверный тип'
      }
    }

    const { level } = req.body
    Debug.info(ctx, `[api/settings/log-level] Получен уровень из запроса: ${level}`)

    if (!level) {
      Debug.warn(ctx, '[api/settings/log-level] Уровень логирования не указан в запросе')
      return {
        success: false,
        error: 'Уровень логирования не указан'
      }
    }

    // Валидация: проверяем, что level - валидная строка
    if (typeof level !== 'string') {
      Debug.warn(
        ctx,
        `[api/settings/log-level] Уровень логирования должен быть строкой, получен: ${typeof level}`
      )
      return {
        success: false,
        error: 'Уровень логирования должен быть строкой'
      }
    }

    // Валидация: проверяем, что исходное значение валидно ДО парсинга
    const validLevels: DebugLevel[] = ['info', 'warn', 'error']
    if (!validLevels.includes(level.toLowerCase() as DebugLevel)) {
      Debug.warn(ctx, `[api/settings/log-level] Недопустимый уровень логирования: ${level}`)
      return {
        success: false,
        error: `Недопустимый уровень логирования. Допустимые значения: ${validLevels.join(', ')}`
      }
    }

    // Теперь безопасно парсим (нормализация только регистра для валидных значений)
    const parsedLevel = parseDebugLevel(level)
    Debug.info(ctx, `[api/settings/log-level] Распарсенный уровень: ${parsedLevel}`)

    // Логируем изменение регистра как информационное сообщение
    if (parsedLevel !== level && parsedLevel === level.toLowerCase()) {
      Debug.info(ctx, `[api/settings/log-level] Регистр уровня изменён: ${level} -> ${parsedLevel}`)
    }

    Debug.info(ctx, `[api/settings/log-level] Сохранение уровня логирования: ${parsedLevel}`)
    await persistLogLevel(ctx, parsedLevel)
    Debug.info(ctx, `[api/settings/log-level] Уровень логирования успешно сохранён: ${parsedLevel}`)

    return {
      success: true,
      level: parsedLevel
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/settings/log-level] Ошибка при сохранении уровня логирования: ${error.message}`,
      'E_SAVE_LOG_LEVEL'
    )
    Debug.error(ctx, `[api/settings/log-level] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при сохранении уровня логирования'
    }
  }
})
