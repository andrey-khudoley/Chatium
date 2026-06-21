// @shared-route
import { Debug } from '../../shared/debug'
import { applyDebugLevel } from '../../lib/logging'
import { runTest } from '../api/run-tests'
import { TEST_CATEGORIES } from '../shared/test-definitions'
import { sendDataToSocket } from '@app/socket'
import { findUserById } from '@app/auth'

/**
 * Джоб для выполнения одного теста
 */
export const runSingleTestJob = app.job('/run-single-test', async (ctx, params) => {
  const { category, testName, userId, testRunId, socketId } = params

  // Получаем пользователя из БД, если ctx.user отсутствует
  let testCtx = ctx
  if (!ctx.user && userId) {
    const user = await findUserById(ctx, userId)
    if (!user) {
      Debug.error(
        ctx,
        `[tests/job] Пользователь не найден: userId=${userId}`,
        'E_TEST_USER_NOT_FOUND'
      )
      throw new Error(`Пользователь не найден: ${userId}`)
    }
    if (user.type !== 'Real') {
      Debug.error(
        ctx,
        `[tests/job] Пользователь не является реальным: userId=${userId}, type=${user.type}`,
        'E_TEST_USER_NOT_REAL'
      )
      throw new Error(`Пользователь не является реальным: ${userId}`)
    }
    // Создаём новый контекст с пользователем, не мутируя исходный ctx
    // Используем Object.create для сохранения прототипа и всех свойств контекста
    testCtx = Object.create(Object.getPrototypeOf(ctx))
    Object.assign(testCtx, ctx, { user })
    Debug.info(
      ctx,
      `[tests/job] Контекст создан с пользователем: userId=${user.id}, type=${user.type}`
    )
  }

  // Добавляем socketId в контекст для отправки Debug.info через WebSocket
  // Делаем это ДО вызова applyDebugLevel и Debug.info, чтобы все логи попадали в консоль
  if (socketId) {
    if (testCtx === ctx) {
      testCtx = Object.create(Object.getPrototypeOf(ctx))
      Object.assign(testCtx, ctx)
    }
    Object.assign(testCtx, {
      _testSocketId: socketId,
      _testCategory: category,
      _testName: testName
    })
  }

  try {
    // Используем testCtx для applyDebugLevel и Debug.info, чтобы логи попадали в консоль
    await applyDebugLevel(testCtx, `tests/job/${category}/${testName}`)
    Debug.info(testCtx, `[tests/job] Начало выполнения теста: ${category}/${testName}`)

    // Отправляем событие о начале теста
    if (socketId) {
      await sendDataToSocket(ctx, socketId, {
        type: 'test-started',
        data: {
          category,
          testName,
          timestamp: new Date().toISOString()
        }
      })
    }

    const result = await runTest(testCtx, category, testName)

    // Используем testCtx для Debug.info, чтобы логи попадали в консоль
    Debug.info(
      testCtx,
      `[tests/job] Тест завершён: ${category}/${testName}, success=${result.success}`
    )

    // Отправляем результат через WebSocket
    if (socketId) {
      Debug.info(
        testCtx,
        `[tests/job] Отправка события test-completed: category=${category}, testName=${testName}, success=${result.success}`
      )
      try {
        await sendDataToSocket(ctx, socketId, {
          type: 'test-completed',
          data: {
            category,
            testName,
            result,
            timestamp: new Date().toISOString()
          }
        })
        Debug.info(testCtx, `[tests/job] Событие test-completed успешно отправлено`)
      } catch (error: any) {
        Debug.error(
          testCtx,
          `[tests/job] Ошибка отправки test-completed: ${error.message}`,
          'E_TEST_SOCKET_ERROR'
        )
      }
    } else {
      Debug.warn(testCtx, `[tests/job] socketId отсутствует, событие test-completed не отправлено`)
    }

    return {
      success: true,
      category,
      testName,
      result,
      testRunId
    }
  } catch (error: any) {
    // Используем testCtx для Debug.error, чтобы логи попадали в консоль
    Debug.error(
      testCtx,
      `[tests/job] Ошибка выполнения теста ${category}/${testName}: ${error.message}`,
      'E_TEST_JOB_ERROR'
    )

    // Отправляем ошибку через WebSocket
    if (socketId) {
      await sendDataToSocket(ctx, socketId, {
        type: 'test-error',
        data: {
          category,
          testName,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      })
    }

    return {
      success: false,
      category,
      testName,
      error: error.message,
      testRunId
    }
  }
})

/**
 * Джоб для выполнения всех тестов в категории последовательно
 */
export const runCategoryTestsJob = app.job('/run-category-tests', async (ctx, params) => {
  const { categoryName, userId, testRunId, startIndex = 0, socketId } = params

  // Получаем пользователя из БД, если ctx.user отсутствует
  let testCtx = ctx
  if (!ctx.user && userId) {
    const user = await findUserById(ctx, userId)
    if (!user) {
      Debug.error(
        ctx,
        `[tests/job] Пользователь не найден: userId=${userId}`,
        'E_TEST_USER_NOT_FOUND'
      )
      throw new Error(`Пользователь не найден: ${userId}`)
    }
    if (user.type !== 'Real') {
      Debug.error(
        ctx,
        `[tests/job] Пользователь не является реальным: userId=${userId}, type=${user.type}`,
        'E_TEST_USER_NOT_REAL'
      )
      throw new Error(`Пользователь не является реальным: ${userId}`)
    }
    // Создаём новый контекст с пользователем, не мутируя исходный ctx
    // Используем Object.create для сохранения прототипа и всех свойств контекста
    testCtx = Object.create(Object.getPrototypeOf(ctx))
    Object.assign(testCtx, ctx, { user })
    Debug.info(
      ctx,
      `[tests/job] Контекст создан с пользователем: userId=${user.id}, type=${user.type}`
    )
  }

  // Добавляем socketId в контекст для отправки Debug.info через WebSocket
  // Делаем это ДО вызова applyDebugLevel и Debug.info, чтобы все логи попадали в консоль
  if (socketId) {
    if (testCtx === ctx) {
      testCtx = Object.create(Object.getPrototypeOf(ctx))
      Object.assign(testCtx, ctx)
    }
    // Для категории пока нет конкретного теста, но добавляем категорию
    Object.assign(testCtx, { _testSocketId: socketId, _testCategory: categoryName, _testName: '' })
  }

  try {
    // Используем testCtx для applyDebugLevel и Debug.info, чтобы логи попадали в консоль
    await applyDebugLevel(testCtx, `tests/job/category/${categoryName}`)
    Debug.info(
      testCtx,
      `[tests/job] Начало выполнения категории: ${categoryName}, startIndex=${startIndex}`
    )

    const category = TEST_CATEGORIES.find((c) => c.name === categoryName)
    if (!category) {
      Debug.error(
        ctx,
        `[tests/job] Категория не найдена: ${categoryName}`,
        'E_TEST_CATEGORY_NOT_FOUND'
      )
      return { success: false, error: `Категория ${categoryName} не найдена` }
    }

    // Отправляем событие о начале категории (только для первого теста)
    if (startIndex === 0 && socketId) {
      await sendDataToSocket(ctx, socketId, {
        type: 'category-started',
        data: {
          categoryName,
          categoryTitle: category.title,
          timestamp: new Date().toISOString()
        }
      })
    }

    const test = category.tests[startIndex]
    if (!test) {
      // Все тесты категории выполнены
      Debug.info(ctx, `[tests/job] Все тесты категории ${categoryName} выполнены`)

      if (socketId) {
        await sendDataToSocket(ctx, socketId, {
          type: 'category-completed',
          data: {
            categoryName,
            timestamp: new Date().toISOString()
          }
        })
      }

      return { success: true, categoryName, completed: true, testRunId }
    }

    // Добавляем socketId в контекст для отправки Debug.info через WebSocket
    // Делаем это перед выполнением теста, чтобы все Debug.info попадали в консоль
    if (socketId && test) {
      if (testCtx === ctx) {
        testCtx = Object.create(Object.getPrototypeOf(ctx))
        Object.assign(testCtx, ctx)
      }
      Object.assign(testCtx, {
        _testSocketId: socketId,
        _testCategory: categoryName,
        _testName: test.name
      })
    }

    // Отправляем событие о начале теста
    if (socketId) {
      await sendDataToSocket(ctx, socketId, {
        type: 'test-started',
        data: {
          category: categoryName,
          testName: test.name,
          timestamp: new Date().toISOString()
        }
      })
    }

    // Выполняем тест синхронно (для последовательности в категории)
    // Используем testCtx с socketId, чтобы все Debug.info попадали в консоль
    const result = await runTest(testCtx, categoryName, test.name)
    // Используем testCtx для Debug.info, чтобы логи попадали в консоль
    Debug.info(
      testCtx,
      `[tests/job] Тест ${categoryName}/${test.name} завершён: success=${result.success}`
    )

    // Отправляем результат через WebSocket
    if (socketId) {
      await sendDataToSocket(ctx, socketId, {
        type: 'test-completed',
        data: {
          category: categoryName,
          testName: test.name,
          result,
          timestamp: new Date().toISOString()
        }
      })
    }

    // Планируем следующий тест в категории последовательно
    if (startIndex + 1 < category.tests.length) {
      await runCategoryTestsJob.scheduleJobAsap(ctx, {
        categoryName,
        userId,
        testRunId,
        startIndex: startIndex + 1,
        socketId
      })
    } else {
      // Категория завершена
      if (socketId) {
        await sendDataToSocket(ctx, socketId, {
          type: 'category-completed',
          data: {
            categoryName,
            timestamp: new Date().toISOString()
          }
        })
      }
    }

    return {
      success: true,
      categoryName,
      testName: test.name,
      testRunId,
      nextTestIndex: startIndex + 1,
      hasMore: startIndex + 1 < category.tests.length
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[tests/job] Ошибка выполнения категории ${categoryName}: ${error.message}`,
      'E_TEST_CATEGORY_JOB_ERROR'
    )

    if (socketId) {
      await sendDataToSocket(ctx, socketId, {
        type: 'category-error',
        data: {
          categoryName,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      })
    }

    return {
      success: false,
      categoryName,
      error: error.message,
      testRunId
    }
  }
})

/**
 * Джоб для запуска всех категорий тестов параллельно
 */
export const runAllTestsJob = app.job('/run-all-tests', async (ctx, params) => {
  const { userId, testRunId, socketId } = params

  // Не трогаем исходный ctx; передаём user дальше через params (используется в дочерних джобах)

  try {
    await applyDebugLevel(ctx, 'tests/job/all')
    Debug.info(ctx, `[tests/job] Начало выполнения всех тестов, testRunId=${testRunId}`)

    // Отправляем событие о начале всех тестов
    if (socketId) {
      await sendDataToSocket(ctx, socketId, {
        type: 'all-tests-started',
        data: {
          testRunId,
          categoriesCount: TEST_CATEGORIES.length,
          timestamp: new Date().toISOString()
        }
      })
    }

    // Запускаем все категории параллельно
    for (const category of TEST_CATEGORIES) {
      await runCategoryTestsJob.scheduleJobAsap(ctx, {
        categoryName: category.name,
        userId,
        testRunId,
        startIndex: 0,
        socketId
      })
    }

    Debug.info(ctx, `[tests/job] Все категории тестов запланированы для выполнения`)

    return {
      success: true,
      testRunId,
      categoriesCount: TEST_CATEGORIES.length
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[tests/job] Ошибка запуска всех тестов: ${error.message}`,
      'E_TEST_ALL_JOB_ERROR'
    )

    if (socketId) {
      await sendDataToSocket(ctx, socketId, {
        type: 'all-tests-error',
        data: {
          testRunId,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      })
    }

    return {
      success: false,
      error: error.message,
      testRunId
    }
  }
})
