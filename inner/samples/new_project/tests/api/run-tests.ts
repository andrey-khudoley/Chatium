// @shared-route
import { TEST_CATEGORIES } from '../shared/test-definitions'
import { Debug } from '../../shared/debug'
import { applyDebugLevel } from '../../lib/logging'
import { ProjectSettings } from '../../tables/settings.table'
import { checkLogsTableAvailable } from '../../lib/logs-operations'
import '../../lib/logs-init'
import { apiGetAdminSettingsRoute, apiUpdateAdminSettingsRoute } from '../../api/admin-settings'
import {
  apiGetLogsRoute,
  apiGetLogsCountsRoute,
  apiResetCountersRoute,
  apiGetSocketIdRoute
} from '../../api/admin-logs'

export const apiRunTestsRoute = app.post('/run', async (_ctx, req) => {
  const { category, test } = req.body as { category?: string; test?: string }

  if (!category || !test) {
    return {
      success: false,
      message: 'Отсутствуют обязательные параметры: category и test'
    }
  }

  return await runTest(_ctx, category, test)
})

/**
 * Интерфейс результата теста
 */
interface TestResult {
  success: boolean
  message: string
}

/**
 * Главная функция запуска теста
 * @param category - категория теста
 * @param testName - название теста
 */
export async function runTest(
  ctx: RichUgcCtx,
  category: string,
  testName: string
): Promise<TestResult> {
  try {
    await applyDebugLevel(ctx, `tests/${category}/${testName}`)
    Debug.info(ctx, `[runTest] ============================================`)
    Debug.info(ctx, `[tests/${category}/${testName}] ===== НАЧАЛО ТЕСТА =====`)
    Debug.info(ctx, `[tests/${category}/${testName}] Категория: ${category}`)
    Debug.info(ctx, `[tests/${category}/${testName}] Тест: ${testName}`)

    // Проверяем, что категория существует
    Debug.info(ctx, `[tests/${category}/${testName}] Проверка существования категории...`)
    const categoryDef = TEST_CATEGORIES.find((c) => c.name === category)
    if (!categoryDef) {
      Debug.error(
        ctx,
        `[tests/${category}/${testName}] ОШИБКА: Категория не найдена: ${category}`,
        'E_TEST_CATEGORY_NOT_FOUND'
      )
      Debug.throw(
        ctx,
        `[tests/${category}/${testName}] Категория не найдена: ${category}`,
        'E_TEST_CATEGORY_NOT_FOUND'
      )
    }
    Debug.info(ctx, `[tests/${category}/${testName}] Категория найдена: ${categoryDef.title}`)

    // Проверяем, что тест существует в категории
    Debug.info(ctx, `[tests/${category}/${testName}] Поиск теста в категории...`)
    const testDef = categoryDef.tests.find((t) => t.name === testName)
    if (!testDef) {
      Debug.error(
        ctx,
        `[tests/${category}/${testName}] ОШИБКА: Тест не найден в категории ${category}: ${testName}`,
        'E_TEST_NOT_FOUND'
      )
      Debug.throw(
        ctx,
        `[tests/${category}/${testName}] Тест не найден в категории ${category}: ${testName}`,
        'E_TEST_NOT_FOUND'
      )
    }
    Debug.info(ctx, `[tests/${category}/${testName}] Тест найден: ${testDef.description}`)

    Debug.info(
      ctx,
      `[tests/${category}/${testName}] Маршрутизация к обработчику категории: ${category}`
    )

    // Маршрутизация по категориям
    let result: TestResult
    switch (category) {
      case 'basic':
        Debug.info(ctx, `[tests/${category}/${testName}] Вызов runBasicTest...`)
        result = await runBasicTest(ctx, testName)
        break
      case 'admin':
        Debug.info(ctx, `[tests/${category}/${testName}] Вызов runAdminTest...`)
        result = await runAdminTest(ctx, testName)
        break
      case 'pages':
        Debug.info(ctx, `[tests/${category}/${testName}] Вызов runPagesTest...`)
        result = await runPagesTest(ctx, testName)
        break
      case 'database':
        Debug.info(ctx, `[tests/${category}/${testName}] Вызов runDatabaseTest...`)
        result = await runDatabaseTest(ctx, testName)
        break
      default:
        Debug.error(
          ctx,
          `[tests/${category}/${testName}] ОШИБКА: Неизвестная категория: ${category}`,
          'E_TEST_UNKNOWN_CATEGORY'
        )
        Debug.throw(
          ctx,
          `[tests/${category}/${testName}] Неизвестная категория: ${category}`,
          'E_TEST_UNKNOWN_CATEGORY'
        )
    }

    Debug.info(ctx, `[tests/${category}/${testName}] Обработчик категории завершён`)
    Debug.info(ctx, `[tests/${category}/${testName}] ===== ТЕСТ ЗАВЕРШЁН =====`)
    Debug.info(ctx, `[tests/${category}/${testName}] Результат: success=${result.success}`)
    Debug.info(ctx, `[tests/${category}/${testName}] Сообщение: ${result.message || 'N/A'}`)
    Debug.info(ctx, `[runTest] ============================================`)

    return result
  } catch (error: any) {
    Debug.error(ctx, `[tests/${category}/${testName}] ===== КРИТИЧЕСКАЯ ОШИБКА =====`, error.code)
    Debug.error(ctx, `[tests/${category}/${testName}] Ошибка: ${error.message}`, error.code)
    Debug.error(ctx, `[tests/${category}/${testName}] Код: ${error.code || 'N/A'}`, error.code)
    Debug.error(ctx, `[tests/${category}/${testName}] Stack trace: ${error.stack || 'N/A'}`)
    Debug.info(ctx, `[runTest] ============================================`)

    return {
      success: false,
      message: error.message || 'Неизвестная ошибка при выполнении теста'
    }
  }
}

/**
 * Выполнение базовых тестов
 */
async function runBasicTest(ctx: RichUgcCtx, testName: string): Promise<TestResult> {
  Debug.info(ctx, `[tests/basic/${testName}] Начало базового теста`)

  switch (testName) {
    case 'app_loads':
      Debug.info(ctx, `[tests/basic/app_loads] Проверка загрузки приложения`)
      Debug.info(ctx, `[tests/basic/app_loads] Тест завершён успешно`)
      return { success: true, message: 'Приложение успешно загружено' }

    default:
      Debug.throw(ctx, `[tests/basic/${testName}] Неизвестный тест: ${testName}`, 'E_TEST_UNKNOWN')
  }
}

/**
 * Выполнение тестов админки
 * Проверяет работу API endpoints для управления настройками и логами
 */
async function runAdminTest(ctx: RichUgcCtx, testName: string): Promise<TestResult> {
  Debug.info(ctx, `[tests/admin/${testName}] Начало теста админки`)

  // Проверяем, что пользователь авторизован
  if (!ctx.user || !ctx.user.id) {
    Debug.throw(ctx, `[tests/admin/${testName}] Пользователь не авторизован`, 'E_TEST_AUTH')
  }

  switch (testName) {
    // Тесты настроек
    case 'api_admin_settings_get':
      try {
        Debug.info(ctx, `[tests/admin/api_admin_settings_get] Тест получения настроек админки`)
        const result = await apiGetAdminSettingsRoute.run(ctx)

        if (!(result as any).success) {
          return { success: false, message: `Ошибка получения настроек: ${(result as any).error}` }
        }

        if (!(result as any).settings || typeof (result as any).settings !== 'object') {
          return { success: false, message: 'Настройки не возвращены или имеют неверный тип' }
        }

        Debug.info(ctx, `[tests/admin/api_admin_settings_get] Тест завершён успешно`)
        return { success: true, message: 'Настройки успешно получены' }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/admin/api_admin_settings_get] Ошибка теста: ${error.message}`,
          'E_TEST_ERROR'
        )
      }

    case 'api_admin_settings_update_project_name':
      try {
        Debug.info(
          ctx,
          `[tests/admin/api_admin_settings_update_project_name] Тест обновления названия проекта`
        )
        const testName = `Test Project ${Date.now()}`
        const result = await apiUpdateAdminSettingsRoute.run(ctx, { project_name: testName })

        if (!(result as any).success) {
          return { success: false, message: `Ошибка обновления: ${(result as any).error}` }
        }

        if ((result as any).settings.project_name !== testName) {
          return {
            success: false,
            message: `Название не обновлено: expected=${testName}, got=${(result as any).settings.project_name}`
          }
        }

        Debug.info(
          ctx,
          `[tests/admin/api_admin_settings_update_project_name] Тест завершён успешно`
        )
        return { success: true, message: 'Название проекта успешно обновлено' }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/admin/api_admin_settings_update_project_name] Ошибка теста: ${error.message}`,
          'E_TEST_ERROR'
        )
      }

    case 'api_admin_settings_update_project_description':
      try {
        Debug.info(
          ctx,
          `[tests/admin/api_admin_settings_update_project_description] Тест обновления описания проекта`
        )
        const testDesc = `Test Description ${Date.now()}`
        const result = await apiUpdateAdminSettingsRoute.run(ctx, { project_description: testDesc })

        if (!(result as any).success) {
          return { success: false, message: `Ошибка обновления: ${(result as any).error}` }
        }

        if ((result as any).settings.project_description !== testDesc) {
          return {
            success: false,
            message: `Описание не обновлено: expected=${testDesc}, got=${(result as any).settings.project_description}`
          }
        }

        Debug.info(
          ctx,
          `[tests/admin/api_admin_settings_update_project_description] Тест завершён успешно`
        )
        return { success: true, message: 'Описание проекта успешно обновлено' }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/admin/api_admin_settings_update_project_description] Ошибка теста: ${error.message}`,
          'E_TEST_ERROR'
        )
      }

    case 'api_admin_settings_update_log_level':
      try {
        Debug.info(
          ctx,
          `[tests/admin/api_admin_settings_update_log_level] Тест обновления уровня логирования`
        )
        const result = await apiUpdateAdminSettingsRoute.run(ctx, { log_level: 'warn' })

        if (!(result as any).success) {
          return { success: false, message: `Ошибка обновления: ${(result as any).error}` }
        }

        if ((result as any).settings.log_level !== 'warn') {
          return {
            success: false,
            message: `Уровень логирования не обновлён: expected=warn, got=${(result as any).settings.log_level}`
          }
        }

        // Восстанавливаем уровень логирования обратно на info
        await apiUpdateAdminSettingsRoute.run(ctx, { log_level: 'info' })

        Debug.info(ctx, `[tests/admin/api_admin_settings_update_log_level] Тест завершён успешно`)
        return { success: true, message: 'Уровень логирования успешно обновлён' }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/admin/api_admin_settings_update_log_level] Ошибка теста: ${error.message}`,
          'E_TEST_ERROR'
        )
      }

    case 'api_admin_settings_invalid_log_level':
      try {
        Debug.info(
          ctx,
          `[tests/admin/api_admin_settings_invalid_log_level] Тест с недопустимым уровнем логирования`
        )
        const result = await apiUpdateAdminSettingsRoute.run(ctx, { log_level: 'invalid' })

        if ((result as any).success === true) {
          return { success: false, message: 'Ожидалась ошибка валидации, но получен success' }
        }

        if (!(result as any).error || !(result as any).error.includes('Недопустимый уровень')) {
          return {
            success: false,
            message: `Ожидалось сообщение о недопустимом уровне, получено: ${(result as any).error}`
          }
        }

        Debug.info(ctx, `[tests/admin/api_admin_settings_invalid_log_level] Тест завершён успешно`)
        return { success: true, message: 'Валидация недопустимого уровня работает корректно' }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/admin/api_admin_settings_invalid_log_level] Ошибка теста: ${error.message}`,
          'E_TEST_ERROR'
        )
      }

    // Тесты логов
    case 'api_admin_logs_get_all':
      try {
        Debug.info(ctx, `[tests/admin/api_admin_logs_get_all] Тест получения всех логов`)
        const result = await apiGetLogsRoute.run(ctx, { query: {} })

        if (!(result as any).success) {
          return { success: false, message: `Ошибка получения логов: ${(result as any).error}` }
        }

        if (!Array.isArray((result as any).logs)) {
          return { success: false, message: 'Логи не возвращены как массив' }
        }

        Debug.info(ctx, `[tests/admin/api_admin_logs_get_all] Тест завершён успешно`)
        return {
          success: true,
          message: `Логи успешно получены: ${(result as any).logs.length} записей`
        }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/admin/api_admin_logs_get_all] Ошибка теста: ${error.message}`,
          'E_TEST_ERROR'
        )
      }

    case 'api_admin_logs_get_filtered':
      try {
        Debug.info(
          ctx,
          `[tests/admin/api_admin_logs_get_filtered] Тест получения логов с фильтрацией`
        )
        const result = await apiGetLogsRoute.run(ctx, { query: { level: 'error' } })

        if (!(result as any).success) {
          return { success: false, message: `Ошибка получения логов: ${(result as any).error}` }
        }

        if (!Array.isArray((result as any).logs)) {
          return { success: false, message: 'Логи не возвращены как массив' }
        }

        // Проверяем, что все логи имеют уровень 'error'
        const nonErrorLogs = (result as any).logs.filter((log: any) => log.level !== 'error')
        if (nonErrorLogs.length > 0) {
          return {
            success: false,
            message: `Найдены логи с другим уровнем: ${nonErrorLogs.length}`
          }
        }

        Debug.info(ctx, `[tests/admin/api_admin_logs_get_filtered] Тест завершён успешно`)
        return {
          success: true,
          message: `Логи с фильтром успешно получены: ${(result as any).logs.length} записей уровня ERROR`
        }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/admin/api_admin_logs_get_filtered] Ошибка теста: ${error.message}`,
          'E_TEST_ERROR'
        )
      }

    case 'api_admin_logs_get_paginated':
      try {
        Debug.info(
          ctx,
          `[tests/admin/api_admin_logs_get_paginated] Тест получения логов с пагинацией`
        )
        const result = await apiGetLogsRoute.run(ctx, { query: { limit: '10', offset: '0' } })

        if (!(result as any).success) {
          return { success: false, message: `Ошибка получения логов: ${(result as any).error}` }
        }

        if (!Array.isArray((result as any).logs)) {
          return { success: false, message: 'Логи не возвращены как массив' }
        }

        if ((result as any).logs.length > 10) {
          return {
            success: false,
            message: `Возвращено больше логов, чем ожидалось: ${(result as any).logs.length}`
          }
        }

        if ((result as any).limit !== 10 || (result as any).offset !== 0) {
          return {
            success: false,
            message: `Неверные параметры пагинации: limit=${(result as any).limit}, offset=${(result as any).offset}`
          }
        }

        Debug.info(ctx, `[tests/admin/api_admin_logs_get_paginated] Тест завершён успешно`)
        return {
          success: true,
          message: `Пагинация работает корректно: ${(result as any).logs.length} записей`
        }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/admin/api_admin_logs_get_paginated] Ошибка теста: ${error.message}`,
          'E_TEST_ERROR'
        )
      }

    case 'api_admin_logs_counts':
      try {
        Debug.info(ctx, `[tests/admin/api_admin_logs_counts] Тест получения счётчиков логов`)
        const result = await apiGetLogsCountsRoute.run(ctx)

        if (!(result as any).success) {
          return { success: false, message: `Ошибка получения счётчиков: ${(result as any).error}` }
        }

        if (!(result as any).counts || typeof (result as any).counts !== 'object') {
          return { success: false, message: 'Счётчики не возвращены' }
        }

        if (
          typeof (result as any).counts.info !== 'number' ||
          typeof (result as any).counts.warn !== 'number' ||
          typeof (result as any).counts.error !== 'number'
        ) {
          return { success: false, message: 'Счётчики имеют неверный тип' }
        }

        // Проверка накопленных счётчиков
        if (
          !(result as any).accumulatedCounts ||
          typeof (result as any).accumulatedCounts !== 'object'
        ) {
          return { success: false, message: 'Накопленные счётчики не возвращены' }
        }

        if (
          typeof (result as any).accumulatedCounts.error !== 'number' ||
          typeof (result as any).accumulatedCounts.warn !== 'number'
        ) {
          return { success: false, message: 'Накопленные счётчики имеют неверный тип' }
        }

        Debug.info(ctx, `[tests/admin/api_admin_logs_counts] Тест завершён успешно`)
        return {
          success: true,
          message: `Счётчики получены: INFO=${(result as any).counts.info}, WARN=${(result as any).counts.warn}, ERROR=${(result as any).counts.error}; Накопленные: ERROR=${(result as any).accumulatedCounts.error}, WARN=${(result as any).accumulatedCounts.warn}`
        }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/admin/api_admin_logs_counts] Ошибка теста: ${error.message}`,
          'E_TEST_ERROR'
        )
      }

    case 'api_admin_logs_counters_increment':
      try {
        Debug.info(ctx, `[tests/admin/api_admin_logs_counters_increment] Тест инкремента счётчиков`)

        // Получаем текущие счётчики
        const beforeResult = await apiGetLogsCountsRoute.run(ctx)
        if (!(beforeResult as any).success) {
          return {
            success: false,
            message: `Ошибка получения счётчиков: ${(beforeResult as any).error}`
          }
        }

        const beforeErrorCount = (beforeResult as any).accumulatedCounts.error
        const beforeWarnCount = (beforeResult as any).accumulatedCounts.warn

        Debug.info(
          ctx,
          `[tests/admin/api_admin_logs_counters_increment] Счётчики до теста: ERROR=${beforeErrorCount}, WARN=${beforeWarnCount}`
        )

        // Создаём тестовые логи
        Debug.error(ctx, '[TEST] Test error log for counter increment', 'E_TEST_COUNTER_INCREMENT')
        Debug.warn(ctx, '[TEST] Test warning log for counter increment')

        // Небольшая задержка для обработки асинхронного сохранения логов
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Получаем счётчики после создания логов
        const afterResult = await apiGetLogsCountsRoute.run(ctx)
        if (!(afterResult as any).success) {
          return {
            success: false,
            message: `Ошибка получения счётчиков после создания логов: ${(afterResult as any).error}`
          }
        }

        const afterErrorCount = (afterResult as any).accumulatedCounts.error
        const afterWarnCount = (afterResult as any).accumulatedCounts.warn

        Debug.info(
          ctx,
          `[tests/admin/api_admin_logs_counters_increment] Счётчики после теста: ERROR=${afterErrorCount}, WARN=${afterWarnCount}`
        )

        // Проверяем, что счётчики увеличились
        if (afterErrorCount !== beforeErrorCount + 1) {
          return {
            success: false,
            message: `Счётчик ошибок не увеличился: before=${beforeErrorCount}, after=${afterErrorCount}, expected=${beforeErrorCount + 1}`
          }
        }

        if (afterWarnCount !== beforeWarnCount + 1) {
          return {
            success: false,
            message: `Счётчик предупреждений не увеличился: before=${beforeWarnCount}, after=${afterWarnCount}, expected=${beforeWarnCount + 1}`
          }
        }

        Debug.info(ctx, `[tests/admin/api_admin_logs_counters_increment] Тест завершён успешно`)
        return {
          success: true,
          message: `Счётчики успешно увеличились: ERROR: ${beforeErrorCount} → ${afterErrorCount}, WARN: ${beforeWarnCount} → ${afterWarnCount}`
        }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/admin/api_admin_logs_counters_increment] Ошибка теста: ${error.message}`,
          'E_TEST_ERROR'
        )
      }

    case 'api_admin_logs_reset_counters':
      try {
        Debug.info(ctx, `[tests/admin/api_admin_logs_reset_counters] Тест сброса счётчиков`)
        const result = await apiResetCountersRoute.run(ctx)

        if (!(result as any).success) {
          return { success: false, message: `Ошибка сброса счётчиков: ${(result as any).error}` }
        }

        Debug.info(ctx, `[tests/admin/api_admin_logs_reset_counters] Тест завершён успешно`)
        return { success: true, message: 'Счётчики успешно сброшены' }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/admin/api_admin_logs_reset_counters] Ошибка теста: ${error.message}`,
          'E_TEST_ERROR'
        )
      }

    case 'api_admin_logs_socket_id':
      try {
        Debug.info(ctx, `[tests/admin/api_admin_logs_socket_id] Тест получения socket ID`)
        const result = await apiGetSocketIdRoute.run(ctx)

        if (!(result as any).success) {
          return { success: false, message: `Ошибка получения socket ID: ${(result as any).error}` }
        }

        if (
          !(result as any).encodedSocketId ||
          typeof (result as any).encodedSocketId !== 'string'
        ) {
          return { success: false, message: 'Socket ID не возвращён или имеет неверный тип' }
        }

        Debug.info(ctx, `[tests/admin/api_admin_logs_socket_id] Тест завершён успешно`)
        return { success: true, message: 'Socket ID успешно получен' }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/admin/api_admin_logs_socket_id] Ошибка теста: ${error.message}`,
          'E_TEST_ERROR'
        )
      }

    // Тесты страницы
    case 'page_admin':
      try {
        Debug.info(ctx, `[tests/admin/page_admin] Тест загрузки страницы админки`)
        // Импортируем роут страницы админки
        const { adminPageRoute } = await import('../../admin')

        // Проверяем, что роут существует и имеет правильную структуру
        if (!adminPageRoute || typeof adminPageRoute.url !== 'function') {
          return { success: false, message: 'Роут админки не найден или имеет неверную структуру' }
        }

        // Проверяем, что URL генерируется корректно
        const url = adminPageRoute.url()
        if (!url || typeof url !== 'string' || !url.includes('/admin')) {
          return { success: false, message: `URL админки некорректен: ${url}` }
        }

        Debug.info(ctx, `[tests/admin/page_admin] Тест завершён успешно`)
        return { success: true, message: `Страница админки доступна по адресу: ${url}` }
      } catch (error: any) {
        Debug.throw(ctx, `[tests/admin/page_admin] Ошибка теста: ${error.message}`, 'E_TEST_ERROR')
      }

    default:
      Debug.throw(ctx, `[tests/admin/${testName}] Неизвестный тест: ${testName}`, 'E_TEST_UNKNOWN')
  }
}

/**
 * Выполнение тестов страниц
 */
async function runPagesTest(ctx: RichUgcCtx, testName: string): Promise<TestResult> {
  Debug.info(ctx, `[tests/pages/${testName}] Начало теста страницы`)

  switch (testName) {
    case 'page_index':
      try {
        Debug.info(ctx, `[tests/pages/page_index] Тест загрузки главной страницы`)
        const { indexPageRoute } = await import('../../index')

        if (!indexPageRoute || typeof indexPageRoute.url !== 'function') {
          return { success: false, message: 'Роут главной страницы не найден' }
        }

        const url = indexPageRoute.url()
        if (!url || typeof url !== 'string') {
          return { success: false, message: `URL главной страницы некорректен: ${url}` }
        }

        Debug.info(ctx, `[tests/pages/page_index] Тест завершён успешно`)
        return { success: true, message: `Главная страница доступна: ${url}` }
      } catch (error: any) {
        Debug.throw(ctx, `[tests/pages/page_index] Ошибка теста: ${error.message}`, 'E_TEST_ERROR')
      }

    case 'page_login':
      try {
        Debug.info(ctx, `[tests/pages/page_login] Тест загрузки страницы входа`)
        const { loginPageRoute } = await import('../../login')

        if (!loginPageRoute || typeof loginPageRoute.url !== 'function') {
          return { success: false, message: 'Роут страницы входа не найден' }
        }

        const url = loginPageRoute.url()
        if (!url || typeof url !== 'string') {
          return { success: false, message: `URL страницы входа некорректен: ${url}` }
        }

        Debug.info(ctx, `[tests/pages/page_login] Тест завершён успешно`)
        return { success: true, message: `Страница входа доступна: ${url}` }
      } catch (error: any) {
        Debug.throw(ctx, `[tests/pages/page_login] Ошибка теста: ${error.message}`, 'E_TEST_ERROR')
      }

    case 'page_profile':
      try {
        Debug.info(ctx, `[tests/pages/page_profile] Тест загрузки страницы профиля`)
        const { profilePageRoute } = await import('../../profile')

        if (!profilePageRoute || typeof profilePageRoute.url !== 'function') {
          return { success: false, message: 'Роут страницы профиля не найден' }
        }

        const url = profilePageRoute.url()
        if (!url || typeof url !== 'string') {
          return { success: false, message: `URL страницы профиля некорректен: ${url}` }
        }

        Debug.info(ctx, `[tests/pages/page_profile] Тест завершён успешно`)
        return { success: true, message: `Страница профиля доступна: ${url}` }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/pages/page_profile] Ошибка теста: ${error.message}`,
          'E_TEST_ERROR'
        )
      }

    default:
      Debug.throw(ctx, `[tests/pages/${testName}] Неизвестный тест: ${testName}`, 'E_TEST_UNKNOWN')
  }
}

/**
 * Выполнение тестов базы данных
 * Проверяет существование и доступность таблиц Heap через выполнение запроса findAll
 */
async function runDatabaseTest(ctx: RichUgcCtx, testName: string): Promise<TestResult> {
  Debug.info(ctx, `[tests/database/${testName}] Начало теста базы данных`)

  switch (testName) {
    case 'table_settings_exists':
      try {
        Debug.info(
          ctx,
          `[tests/database/table_settings_exists] Проверка доступности таблицы Settings`
        )
        await ProjectSettings.findAll(ctx, { limit: 1 })
        Debug.info(ctx, `[tests/database/table_settings_exists] Тест завершён успешно`)
        return { success: true, message: 'Таблица Settings существует и доступна' }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/database/table_settings_exists] Таблица недоступна: ${error.message}`,
          'E_TEST_DB_ERROR'
        )
      }

    case 'table_logs_exists':
      try {
        Debug.info(
          ctx,
          `[tests/database/table_logs_exists] Проверка доступности таблицы ProjectLogs`
        )
        await checkLogsTableAvailable(ctx)
        Debug.info(ctx, `[tests/database/table_logs_exists] Тест завершён успешно`)
        return { success: true, message: 'Таблица ProjectLogs существует и доступна' }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/database/table_logs_exists] Таблица недоступна: ${error.message}`,
          'E_TEST_DB_ERROR'
        )
      }

    default:
      Debug.throw(
        ctx,
        `[tests/database/${testName}] Неизвестный тест: ${testName}`,
        'E_TEST_UNKNOWN'
      )
  }
}
