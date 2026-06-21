// @shared-route
import { requireAnyUser } from '@app/auth'
import { Debug } from '../../shared/debug'
import { applyDebugLevel } from '../../lib/logging'
import { genSocketId } from '@app/socket'
import { TEST_CATEGORIES } from '../shared/test-definitions'
import { runTest } from './run-tests'
import '../../lib/logs-init'

/**
 * GET /list
 * Список всех тестов (единый источник истины с test-definitions.ts)
 */
export const apiGetTestsListRoute = app.get('/list', async (ctx, req) => {
  try {
    requireAnyUser(ctx)
    return {
      success: true,
      categories: TEST_CATEGORIES
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Ошибка при получении списка тестов'
    }
  }
})

/**
 * GET /run-all
 * Запуск всех тестов (для AI страницы и интерактивного UI)
 */
export const apiRunAllTestsRoute = app.get('/run-all', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'tests/api/run-all')
    Debug.info(ctx, '[tests/api/run-all] Запрос на запуск всех тестов')

    requireAnyUser(ctx)

    const results: Array<{ category: string; test: string; success: boolean; message: string }> = []

    for (const category of TEST_CATEGORIES) {
      for (const test of category.tests) {
        const result = await runTest(ctx, category.name, test.name)
        results.push({
          category: category.name,
          test: test.name,
          ...result
        })
      }
    }

    Debug.info(ctx, '[tests/api/run-all] Все тесты завершены')

    return {
      success: true,
      results
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[tests/api/run-all] Ошибка запуска тестов: ${error.message}`,
      'E_RUN_ALL_TESTS_ERROR'
    )
    return {
      success: false,
      error: error.message || 'Ошибка при запуске тестов'
    }
  }
})

/**
 * POST /run-single
 * Запуск одного теста (для интерактивной страницы)
 */
export const apiRunSingleTestRoute = app.post('/run-single', async (ctx, req) => {
  try {
    Debug.info(ctx, '[tests/api/run-single] === НАЧАЛО ОБРАБОТКИ ЗАПРОСА ===')
    await applyDebugLevel(ctx, 'tests/api/run-single')
    Debug.info(ctx, '[tests/api/run-single] Уровень логирования применён')

    Debug.info(ctx, '[tests/api/run-single] Проверка авторизации пользователя...')
    requireAnyUser(ctx)
    Debug.info(ctx, `[tests/api/run-single] Пользователь авторизован: userId=${ctx.user.id}`)

    Debug.info(ctx, `[tests/api/run-single] Получено тело запроса: ${JSON.stringify(req.body)}`)
    const { category, test } = req.body as { category: string; test: string }

    Debug.info(
      ctx,
      `[tests/api/run-single] Парсинг параметров: category="${category}", test="${test}"`
    )

    if (!category || !test) {
      Debug.warn(
        ctx,
        `[tests/api/run-single] ОШИБКА: Отсутствуют обязательные параметры: category=${category}, test=${test}`
      )
      return {
        success: false,
        error: 'Отсутствуют обязательные параметры: category и test'
      }
    }

    Debug.info(ctx, '[tests/api/run-single] Запуск теста...')
    const result = await runTest(ctx, category, test)

    Debug.info(ctx, `[tests/api/run-single] Тест завершён: success=${result.success}`)
    Debug.info(ctx, '[tests/api/run-single] === КОНЕЦ ОБРАБОТКИ ЗАПРОСА (SUCCESS) ===')

    return {
      success: true,
      result
    }
  } catch (error: any) {
    Debug.error(ctx, '[tests/api/run-single] === КРИТИЧЕСКАЯ ОШИБКА ===', 'E_RUN_SINGLE_TEST_ERROR')
    Debug.error(ctx, `[tests/api/run-single] Ошибка: ${error.message}`, 'E_RUN_SINGLE_TEST_ERROR')
    Debug.error(
      ctx,
      `[tests/api/run-single] Stack: ${error.stack || 'N/A'}`,
      'E_RUN_SINGLE_TEST_ERROR'
    )
    return {
      success: false,
      error: error.message || 'Ошибка при запуске теста'
    }
  }
})

/**
 * GET /get-manual-socket-id
 * Получение encodedSocketId для точечных тестов (для предварительной установки подписки)
 */
export const apiGetManualSocketIdRoute = app.get('/get-manual-socket-id', async (ctx, req) => {
  try {
    requireAnyUser(ctx)

    const socketId = `tests-${ctx.user.id}-manual`
    const encodedSocketId = await genSocketId(ctx, socketId)

    return {
      success: true,
      encodedSocketId,
      socketId
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[tests/api/get-manual-socket-id] Ошибка: ${error.message}`,
      'E_GET_SOCKET_ID_ERROR'
    )
    return {
      success: false,
      error: error.message || 'Ошибка при получении socketId'
    }
  }
})
