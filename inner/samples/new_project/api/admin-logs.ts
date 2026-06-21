// @shared-route
// ВАЖНО: В контексте @shared-route Heap не инициализирован. Логи и счётчики загружаются только при рендере
// страницы админки (admin.tsx). Эндпоинты POST / и GET /counts здесь возвращают 503 и не обращаются к Heap.

import { requireAccountRole } from '@app/auth'
import { genSocketId } from '@app/socket'
import { Debug } from '../shared/debug'
import { resetCounters } from '../lib/logging'

const ADMIN_LOGS_SOCKET_ID = 'admin-logs'

const LOGS_UNAVAILABLE_MESSAGE =
  'Логи доступны только при загрузке страницы админки (Heap не инициализирован в контексте API). Используйте ссылки «Показать ещё» / «Показать все» или обновите страницу.'

/**
 * POST /admin/logs
 * В контексте API Heap не инициализирован — логи загружаются при рендере страницы (admin.tsx).
 * Всегда возвращаем 503 с подсказкой использовать страницу.
 */
export const apiGetLogsRoute = app.post('/', async (ctx, req) => {
  try {
    requireAccountRole(ctx, 'Admin')
    return {
      success: false,
      error: LOGS_UNAVAILABLE_MESSAGE
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Ошибка при получении логов'
    }
  }
})

/**
 * GET /admin/logs/counts
 * В контексте API Heap не инициализирован — счётчики загружаются при рендере страницы (admin.tsx).
 * Всегда возвращаем 503 с подсказкой.
 */
export const apiGetLogsCountsRoute = app.get('/counts', async (ctx, req) => {
  try {
    requireAccountRole(ctx, 'Admin')
    return {
      success: false,
      error: LOGS_UNAVAILABLE_MESSAGE
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Ошибка при получении счётчиков логов'
    }
  }
})

/**
 * POST /admin/logs/reset-counters
 * Сброс счётчиков ошибок и предупреждений
 *
 * Это действие пользователя - оставляем минимальное логирование.
 */
export const apiResetCountersRoute = app.post('/reset-counters', async (ctx, req) => {
  try {
    requireAccountRole(ctx, 'Admin')

    await resetCounters(ctx)
    Debug.info(ctx, '[api/admin-logs] Счётчики успешно сброшены')

    return {
      success: true,
      message: 'Счётчики успешно сброшены'
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/admin-logs] Ошибка при сбросе счётчиков: ${error.message}`,
      'E_RESET_COUNTERS'
    )
    return {
      success: false,
      error: error.message || 'Ошибка при сбросе счётчиков'
    }
  }
})

/**
 * GET /admin/logs/socket-id
 * Получение encodedSocketId для WebSocket подключения
 *
 * ВАЖНО: Этот endpoint НЕ логирует свою работу через Debug,
 * чтобы избежать рекурсии.
 */
export const apiGetSocketIdRoute = app.get('/socket-id', async (ctx, req) => {
  try {
    requireAccountRole(ctx, 'Admin')

    const encodedSocketId = await genSocketId(ctx, ADMIN_LOGS_SOCKET_ID)

    return {
      success: true,
      encodedSocketId
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/admin-logs] Ошибка при получении socket-id: ${error.message}`,
      'E_GET_SOCKET_ID'
    )
    return {
      success: false,
      error: error.message || 'Ошибка при получении socket-id'
    }
  }
})

/**
 * POST /admin/logs/test-error
 * Создание тестовой ошибки для проверки работы счётчиков
 */
export const apiTestErrorRoute = app.post('/test-error', async (ctx, req) => {
  try {
    requireAccountRole(ctx, 'Admin')

    // Создаём одну тестовую ошибку
    Debug.error(ctx, '[ТЕСТ] Тестовая ошибка для проверки счётчика', 'E_TEST_ERROR')

    return {
      success: true,
      message: 'Тестовая ошибка создана'
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/admin-logs] Ошибка при создании тестовой ошибки: ${error.message}`,
      'E_TEST_ERROR_FAILED'
    )
    return {
      success: false,
      error: error.message || 'Ошибка при создании тестовой ошибки'
    }
  }
})

/**
 * POST /admin/logs/test-warning
 * Создание тестового предупреждения для проверки работы счётчиков
 */
export const apiTestWarningRoute = app.post('/test-warning', async (ctx, req) => {
  try {
    requireAccountRole(ctx, 'Admin')

    Debug.warn(ctx, '[TEST] Тестовое предупреждение для проверки счётчика')

    return {
      success: true,
      message: 'Тестовое предупреждение создано'
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/admin-logs] Ошибка при создании тестового предупреждения: ${error.message}`,
      'E_TEST_WARNING_FAILED'
    )
    return {
      success: false,
      error: error.message || 'Ошибка при создании тестового предупреждения'
    }
  }
})

/**
 * GET /admin/logs/test-callbacks
 * Проверка, установлены ли callbacks
 */
export const apiTestCallbacksRoute = app.get('/test-callbacks', async (ctx, req) => {
  try {
    requireAccountRole(ctx, 'Admin')

    const { checkCallbacksStatus } = await import('../lib/logs-operations')
    const status = checkCallbacksStatus()

    Debug.info(
      ctx,
      `[TEST] Статус callbacks: errorCallback=${status.errorCallbackSet}, warnCallback=${status.warnCallbackSet}`
    )

    return {
      success: true,
      status
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/admin-logs] Ошибка при проверке callbacks: ${error.message}`,
      'E_TEST_CALLBACKS_FAILED'
    )
    return {
      success: false,
      error: error.message || 'Ошибка при проверке callbacks'
    }
  }
})
