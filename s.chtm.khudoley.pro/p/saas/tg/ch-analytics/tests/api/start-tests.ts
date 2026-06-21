// @shared-route
import { requireAnyUser } from '@app/auth'
import { Debug } from '../../shared/debug'
import { applyDebugLevel } from '../../lib/logging'
import { genSocketId } from '@app/socket'
import { runAllTestsJob, runSingleTestJob } from '../jobs/test-runner.job'

/**
 * POST /start-all
 * Запуск всех тестов асинхронно через Jobs
 */
export const apiStartAllTestsRoute = app.post('/start-all', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'tests/api/start-all')
    Debug.info(ctx, '[tests/api/start-all] Запрос на запуск всех тестов')

    requireAnyUser(ctx)

    const testRunId = `test-run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const socketId = `tests-${ctx.user.id}-${testRunId}`
    const encodedSocketId = await genSocketId(ctx, socketId)

    Debug.info(
      ctx,
      `[tests/api/start-all] Генерация socketId: raw=${socketId}, encoded=${encodedSocketId}`
    )

    // Запускаем все тесты асинхронно через джоб с небольшой задержкой,
    // чтобы дать клиенту время установить подписку
    await runAllTestsJob.scheduleJobAfter(ctx, 0.2, 'seconds', {
      userId: ctx.user.id,
      testRunId,
      socketId
    })

    Debug.info(
      ctx,
      `[tests/api/start-all] Все тесты запланированы для выполнения с задержкой 0.2s, testRunId=${testRunId}`
    )

    return {
      success: true,
      testRunId,
      encodedSocketId,
      message: 'Тесты запущены асинхронно'
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[tests/api/start-all] Ошибка запуска тестов: ${error.message}`,
      'E_START_TESTS_ERROR'
    )
    return {
      success: false,
      error: error.message || 'Ошибка при запуске тестов'
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

    // Используем один общий socketId для всех точечных тестов
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

/**
 * POST /start-single
 * Запуск одного теста асинхронно через Job
 */
export const apiStartSingleTestRoute = app.post('/start-single', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'tests/api/start-single')
    Debug.info(ctx, '[tests/api/start-single] Запрос на запуск одного теста')

    requireAnyUser(ctx)

    const { category, test } = req.body as { category: string; test: string }

    if (!category || !test) {
      Debug.warn(
        ctx,
        `[tests/api/start-single] Отсутствуют обязательные параметры: category=${category}, test=${test}`
      )
      return {
        success: false,
        error: 'Отсутствуют обязательные параметры: category и test'
      }
    }

    // Используем один общий socketId для всех точечных тестов
    const socketId = `tests-${ctx.user.id}-manual`
    const testRunId = `test-run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    Debug.info(
      ctx,
      `[tests/api/start-single] Запуск теста: ${category}/${test}, socketId=${socketId}, testRunId=${testRunId}`
    )

    // Запускаем тест асинхронно через джоб
    await runSingleTestJob.scheduleJobAsap(ctx, {
      category,
      testName: test,
      userId: ctx.user.id,
      testRunId,
      socketId
    })

    Debug.info(ctx, `[tests/api/start-single] Тест запланирован для выполнения`)

    return {
      success: true,
      testRunId,
      socketId,
      message: 'Тест запущен асинхронно'
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[tests/api/start-single] Ошибка запуска теста: ${error.message}`,
      'E_START_SINGLE_TEST_ERROR'
    )
    return {
      success: false,
      error: error.message || 'Ошибка при запуске теста'
    }
  }
})
