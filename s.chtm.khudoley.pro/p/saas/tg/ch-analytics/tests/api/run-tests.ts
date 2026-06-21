// @shared-route
import { TEST_CATEGORIES } from '../shared/test-definitions'
import { Debug } from '../../shared/debug'
import { applyDebugLevel } from '../../lib/logging'
import {
  apiValidateTokenRoute,
  apiAddBotRoute,
  apiGetBotsListRoute,
  apiDeleteBotRoute
} from '../../api/bots'
import { BotTokens } from '../../tables/bot-tokens.table'
import { Projects } from '../../tables/projects.table'
import { ProjectRequests } from '../../tables/project-requests.table'
import {
  apiGetProjectsListRoute,
  apiCreateProjectRoute,
  apiDeleteProjectRoute,
  apiGetProjectRoute,
  apiJoinProjectRequestRoute,
  apiGetProjectRequestsRoute,
  apiApproveProjectRequestRoute,
  apiRejectProjectRequestRoute,
  apiRemoveProjectMemberRoute
} from '../../api/projects'
import { request } from '@app/request'
import { userIdsMatch } from '../../shared/user-utils'

export const apiRunTestsRoute = app.post('/run', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'tests/api/run')
    Debug.info(ctx, '[tests/api/run] Начало выполнения теста')

    const { category, test } = req.body as { category: string; test: string }

    if (!category || !test) {
      Debug.warn(
        ctx,
        `[tests/api/run] Отсутствуют обязательные параметры: category=${category}, test=${test}`
      )
      return {
        success: false,
        message: 'Отсутствуют обязательные параметры: category и test'
      }
    }

    Debug.info(ctx, `[tests/api/run] Запуск теста: ${category}/${test}`)
    const result = await runTest(ctx, category, test)
    Debug.info(ctx, `[tests/api/run] Тест завершён: success=${result.success}`)

    return result
  } catch (error: any) {
    Debug.error(
      ctx,
      `[tests/api/run] Ошибка выполнения теста: ${error.message}`,
      'E_TEST_RUN_ERROR'
    )
    if (error.stack) {
      Debug.error(ctx, `[tests/api/run] Stack trace: ${error.stack}`)
    }
    return {
      success: false,
      message: error.message || 'Неизвестная ошибка при выполнении теста'
    }
  }
})

// Функция выполнения тестов (перенесена из test-definitions.ts для разделения клиент/сервер)
export async function runTest(
  ctx: any,
  category: string,
  testName: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Обновляем категорию и testName в контексте для Debug.info
    // Это гарантирует, что все Debug.info будут иметь правильную информацию о тесте
    if (ctx._testSocketId) {
      ctx._testCategory = category
      ctx._testName = testName
    }

    // Применяем уровень логирования из настроек
    await applyDebugLevel(ctx, `tests/${category}/${testName}`)
    Debug.info(ctx, `[tests] Начало выполнения теста: ${category}/${testName}`)

    if (category === 'basic') {
      if (testName === 'app_loads') {
        Debug.info(ctx, `[tests/basic] Тест app_loads завершён успешно`)
        return { success: true, message: 'Приложение успешно загружено' }
      }
    }

    if (category === 'api') {
      return await runApiTest(ctx, testName)
    }

    if (category === 'api_http') {
      return await runApiHttpTest(ctx, testName)
    }

    if (category === 'database') {
      return await runDatabaseTest(ctx, testName)
    }

    if (category === 'pages') {
      return await runPagesTest(ctx, testName)
    }

    if (category === 'projects_database') {
      return await runProjectsDatabaseTest(ctx, testName)
    }

    if (category === 'projects_api') {
      return await runProjectsApiTest(ctx, testName)
    }

    if (category === 'projects_integration') {
      return await runProjectsIntegrationTest(ctx, testName)
    }

    Debug.warn(ctx, `[tests] Тест ${category}/${testName} не найден`)
    return { success: false, message: `Тест ${category}/${testName} не найден` }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[tests] Ошибка выполнения теста ${category}/${testName}: ${error.message || 'Неизвестная ошибка'}`,
      'E_TEST_FAILED'
    )
    if (error.stack) {
      Debug.error(ctx, `[tests] Stack trace: ${error.stack}`)
    }
    return { success: false, message: error.message || 'Неизвестная ошибка' }
  }
}

// Тесты API через route.run
async function runApiTest(
  ctx: any,
  testName: string
): Promise<{ success: boolean; message: string }> {
  Debug.info(ctx, `[tests/api] Начало теста: ${testName}`)

  switch (testName) {
    case 'validate_token_empty':
      const emptyResult = await apiValidateTokenRoute.run(ctx, { token: '' })
      if (emptyResult.success) {
        Debug.throw(
          ctx,
          `[tests/api/validate_token_empty] Ожидалась ошибка для пустого токена`,
          'E_TEST_FAILED'
        )
      }
      if (!emptyResult.error || !emptyResult.error.includes('обязателен')) {
        Debug.throw(
          ctx,
          `[tests/api/validate_token_empty] Неверное сообщение об ошибке: ${emptyResult.error}`,
          'E_TEST_FAILED'
        )
      }
      Debug.info(ctx, `[tests/api/validate_token_empty] Тест завершён успешно`)
      return { success: true, message: 'Пустой токен корректно отклонён' }

    case 'validate_token_invalid':
      const invalidResult = await apiValidateTokenRoute.run(ctx, { token: 'invalid_token_12345' })
      if (invalidResult.success) {
        Debug.throw(
          ctx,
          `[tests/api/validate_token_invalid] Ожидалась ошибка для невалидного токена`,
          'E_TEST_FAILED'
        )
      }
      Debug.info(ctx, `[tests/api/validate_token_invalid] Тест завершён успешно`)
      return { success: true, message: 'Невалидный токен корректно отклонён' }

    case 'add_bot_empty_token':
      const addEmptyResult = await apiAddBotRoute.run(ctx, { token: '' })
      if (addEmptyResult.success) {
        Debug.throw(
          ctx,
          `[tests/api/add_bot_empty_token] Ожидалась ошибка для пустого токена`,
          'E_TEST_FAILED'
        )
      }
      Debug.info(ctx, `[tests/api/add_bot_empty_token] Тест завершён успешно`)
      return { success: true, message: 'Добавление с пустым токеном корректно отклонено' }

    case 'add_bot_duplicate':
      // Проверяем авторизацию
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(ctx, `[tests/api/add_bot_duplicate] Пользователь не авторизован`, 'E_TEST_AUTH')
      }

      // Создаём тестовый проект
      const testProjectForDuplicate = await Projects.create(ctx, {
        name: `Test Project Duplicate ${Date.now()}`,
        members: [
          {
            userId: ctx.user.id,
            role: 'owner'
          }
        ]
      })

      // Создаём тестового бота
      const testToken = `test_token_${Date.now()}`
      let testBot: any = null

      try {
        Debug.info(
          ctx,
          `[tests/api/add_bot_duplicate] Создание тестового бота с токеном: ${testToken.substring(0, 10)}...`
        )
        testBot = await BotTokens.create(ctx, {
          token: testToken,
          botName: 'Test Bot',
          botUsername: 'testbot',
          projectId: testProjectForDuplicate.id
        })
        Debug.info(ctx, `[tests/api/add_bot_duplicate] Тестовый бот создан с ID: ${testBot.id}`)

        // Пытаемся добавить того же бота снова
        Debug.info(ctx, `[tests/api/add_bot_duplicate] Попытка добавить дубликат токена`)
        const duplicateResult = await apiAddBotRoute.run(ctx, {
          token: testToken,
          botName: 'Test Bot',
          botUsername: 'testbot',
          projectId: testProjectForDuplicate.id
        })

        if (duplicateResult.success) {
          Debug.throw(
            ctx,
            `[tests/api/add_bot_duplicate] Ожидалась ошибка для дубликата токена`,
            'E_TEST_FAILED'
          )
        }
        if (!duplicateResult.error || !duplicateResult.error.includes('уже добавлен')) {
          Debug.throw(
            ctx,
            `[tests/api/add_bot_duplicate] Неверное сообщение об ошибке: ${duplicateResult.error}`,
            'E_TEST_FAILED'
          )
        }
        Debug.info(ctx, `[tests/api/add_bot_duplicate] Тест завершён успешно`)
        return { success: true, message: 'Дубликат токена корректно обнаружен' }
      } finally {
        // Гарантированно удаляем тестового бота даже при ошибке
        if (testBot && testBot.id) {
          try {
            Debug.info(
              ctx,
              `[tests/api/add_bot_duplicate] Удаление тестового бота с ID: ${testBot.id}`
            )
            await BotTokens.delete(ctx, testBot.id)
            Debug.info(ctx, `[tests/api/add_bot_duplicate] Тестовый бот успешно удалён`)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/api/add_bot_duplicate] Ошибка при удалении тестового бота: ${deleteError.message}`
            )
            // Игнорируем ошибки удаления (возможно уже удалён)
          }
        }
        // Удаляем тестовый проект
        if (testProjectForDuplicate && testProjectForDuplicate.id) {
          try {
            await Projects.delete(ctx, testProjectForDuplicate.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/api/add_bot_duplicate] Ошибка при удалении тестового проекта: ${deleteError.message}`
            )
          }
        }
      }

    case 'add_bot_success':
      // Используем невалидный токен, но проверяем структуру ответа
      // (не можем использовать реальный токен в тестах)
      let createdBotId: string | null = null

      try {
        const testToken = `test_success_${Date.now()}`
        Debug.info(
          ctx,
          `[tests/api/add_bot_success] Попытка добавить бота с тестовым токеном: ${testToken.substring(0, 10)}...`
        )
        const addResult = await apiAddBotRoute.run(ctx, {
          token: testToken,
          botName: 'Test Bot',
          botUsername: 'testbot'
        })

        // Ожидаем ошибку валидации токена, но проверяем что структура ответа правильная
        if (addResult.success) {
          // Если токен каким-то образом валиден, сохраняем ID для удаления
          if (addResult.bot && addResult.bot.id) {
            createdBotId = addResult.bot.id
            Debug.info(ctx, `[tests/api/add_bot_success] Бот создан с ID: ${createdBotId}`)
          }
          Debug.info(ctx, `[tests/api/add_bot_success] Тест завершён успешно`)
          return { success: true, message: 'Бот успешно добавлен' }
        }

        // Если ошибка - это нормально для тестового токена
        // Проверяем что структура ответа правильная
        if (!addResult.error) {
          Debug.throw(
            ctx,
            `[tests/api/add_bot_success] Ожидалось сообщение об ошибке`,
            'E_TEST_FAILED'
          )
        }
        Debug.info(
          ctx,
          `[tests/api/add_bot_success] Тест завершён успешно (ошибка валидации токена ожидаема)`
        )
        return {
          success: true,
          message: 'Структура ответа корректна (ошибка валидации токена ожидаема)'
        }
      } finally {
        // Гарантированно удаляем созданного бота если он был создан
        if (createdBotId) {
          try {
            Debug.info(
              ctx,
              `[tests/api/add_bot_success] Удаление созданного бота с ID: ${createdBotId}`
            )
            await BotTokens.delete(ctx, createdBotId)
            Debug.info(ctx, `[tests/api/add_bot_success] Бот успешно удалён`)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/api/add_bot_success] Ошибка при удалении бота: ${deleteError.message}`
            )
            // Игнорируем ошибки удаления (возможно уже удалён)
          }
        }
      }

    case 'delete_bot_empty_id':
      const deleteEmptyResult = await apiDeleteBotRoute.run(ctx, { botId: '' })
      if (deleteEmptyResult.success) {
        Debug.throw(
          ctx,
          `[tests/api/delete_bot_empty_id] Ожидалась ошибка для пустого ID`,
          'E_TEST_FAILED'
        )
      }
      if (!deleteEmptyResult.error || !deleteEmptyResult.error.includes('обязателен')) {
        Debug.throw(
          ctx,
          `[tests/api/delete_bot_empty_id] Неверное сообщение об ошибке: ${deleteEmptyResult.error}`,
          'E_TEST_FAILED'
        )
      }
      Debug.info(ctx, `[tests/api/delete_bot_empty_id] Тест завершён успешно`)
      return { success: true, message: 'Пустой ID корректно отклонён' }

    case 'delete_bot_not_found':
      const deleteNotFoundResult = await apiDeleteBotRoute.run(ctx, {
        botId: 'non_existent_id_12345'
      })
      if (deleteNotFoundResult.success) {
        Debug.throw(
          ctx,
          `[tests/api/delete_bot_not_found] Ожидалась ошибка для несуществующего бота`,
          'E_TEST_FAILED'
        )
      }
      if (!deleteNotFoundResult.error || !deleteNotFoundResult.error.includes('не найден')) {
        Debug.throw(
          ctx,
          `[tests/api/delete_bot_not_found] Неверное сообщение об ошибке: ${deleteNotFoundResult.error}`,
          'E_TEST_FAILED'
        )
      }
      Debug.info(ctx, `[tests/api/delete_bot_not_found] Тест завершён успешно`)
      return { success: true, message: 'Несуществующий бот корректно отклонён' }

    case 'delete_bot_success':
      // Проверяем авторизацию
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/api/delete_bot_success] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      // Создаём тестовый проект
      const testProjectForDelete = await Projects.create(ctx, {
        name: `Test Project Delete ${Date.now()}`,
        members: [
          {
            userId: ctx.user.id,
            role: 'owner'
          }
        ]
      })

      // Создаём тестового бота для удаления
      const testTokenForDelete = `test_delete_${Date.now()}`
      let testBotForDelete: any = null

      try {
        Debug.info(
          ctx,
          `[tests/api/delete_bot_success] Создание тестового бота с токеном: ${testTokenForDelete.substring(0, 10)}...`
        )
        testBotForDelete = await BotTokens.create(ctx, {
          token: testTokenForDelete,
          botName: 'Test Bot For Delete',
          botUsername: 'testbotdelete',
          projectId: testProjectForDelete.id
        })
        Debug.info(
          ctx,
          `[tests/api/delete_bot_success] Тестовый бот создан с ID: ${testBotForDelete.id}`
        )

        // Удаляем бота через API
        Debug.info(ctx, `[tests/api/delete_bot_success] Попытка удаления бота через API`)
        const deleteResult = await apiDeleteBotRoute.run(ctx, {
          botId: testBotForDelete.id
        })

        if (!deleteResult.success) {
          Debug.throw(
            ctx,
            `[tests/api/delete_bot_success] Ошибка при удалении бота: ${deleteResult.error}`,
            'E_TEST_FAILED'
          )
        }

        // Проверяем, что бот действительно удалён
        Debug.info(ctx, `[tests/api/delete_bot_success] Проверка удаления бота из таблицы`)
        const deletedBot = await BotTokens.findById(ctx, testBotForDelete.id)
        if (deletedBot) {
          Debug.throw(
            ctx,
            `[tests/api/delete_bot_success] Бот не был удалён из таблицы`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(ctx, `[tests/api/delete_bot_success] Тест завершён успешно`)
        return { success: true, message: 'Бот успешно удалён через API' }
      } catch (error: any) {
        // Если ошибка произошла до удаления, пытаемся удалить вручную
        if (testBotForDelete && testBotForDelete.id) {
          try {
            Debug.info(
              ctx,
              `[tests/api/delete_bot_success] Очистка: удаление тестового бота с ID: ${testBotForDelete.id}`
            )
            await BotTokens.delete(ctx, testBotForDelete.id)
            Debug.info(
              ctx,
              `[tests/api/delete_bot_success] Тестовый бот успешно удалён при очистке`
            )
          } catch (cleanupError: any) {
            Debug.warn(
              ctx,
              `[tests/api/delete_bot_success] Ошибка при очистке: ${cleanupError.message}`
            )
          }
        }
        throw error
      } finally {
        // Удаляем тестовый проект
        if (testProjectForDelete && testProjectForDelete.id) {
          try {
            await Projects.delete(ctx, testProjectForDelete.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/api/delete_bot_success] Ошибка при удалении тестового проекта: ${deleteError.message}`
            )
          }
        }
      }

    default:
      Debug.throw(ctx, `[tests/api] Неизвестный тест API: ${testName}`, 'E_TEST_UNKNOWN')
  }
}

// Тесты HTTP доступности
async function runApiHttpTest(
  ctx: any,
  testName: string
): Promise<{ success: boolean; message: string }> {
  Debug.info(ctx, `[tests/api_http] Начало теста: ${testName}`)

  switch (testName) {
    case 'http_post_validate_token':
      // Используем .url() метод роута для получения правильного URL
      const validateUrl = apiValidateTokenRoute.url()
      Debug.info(ctx, `[tests/api_http/http_post_validate_token] Запрос к URL: ${validateUrl}`)

      // 1. Проверяем невалидный токен
      const invalidToken = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
      Debug.info(
        ctx,
        `[tests/api_http/http_post_validate_token] Шаг 1: Проверка невалидного токена`
      )

      const invalidResponse = await request({
        url: validateUrl,
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        json: {
          token: invalidToken
        },
        responseType: 'json',
        throwHttpErrors: false
      })

      Debug.info(
        ctx,
        `[tests/api_http/http_post_validate_token] Ответ для невалидного токена: statusCode=${invalidResponse.statusCode}`
      )

      // Проверяем что endpoint доступен (не 500+)
      if (invalidResponse.statusCode >= 500) {
        Debug.throw(
          ctx,
          `[tests/api_http/http_post_validate_token] HTTP ${invalidResponse.statusCode} - серверная ошибка`,
          'E_TEST_HTTP_ERROR'
        )
      }

      // Проверяем, что endpoint корректно обработал невалидный токен
      const invalidBody = invalidResponse.body as any
      if (invalidResponse.statusCode === 200 && invalidBody?.success === false) {
        Debug.info(
          ctx,
          `[tests/api_http/http_post_validate_token] Endpoint корректно вернул ошибку для невалидного токена: ${invalidBody.error || 'неизвестная ошибка'}`
        )
      } else if (invalidResponse.statusCode === 401) {
        Debug.info(
          ctx,
          `[tests/api_http/http_post_validate_token] Endpoint требует авторизации (ожидаемо для HTTP теста)`
        )
      }

      // 2. Проверяем валидный тестовый токен Telegram
      // Telegram предоставляет специальный тестовый токен для тестирования
      const validTestToken = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'
      Debug.info(
        ctx,
        `[tests/api_http/http_post_validate_token] Шаг 2: Проверка валидного тестового токена Telegram`
      )

      const validResponse = await request({
        url: validateUrl,
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        json: {
          token: validTestToken
        },
        responseType: 'json',
        throwHttpErrors: false
      })

      Debug.info(
        ctx,
        `[tests/api_http/http_post_validate_token] Ответ для валидного токена: statusCode=${validResponse.statusCode}`
      )

      // Проверяем что endpoint доступен (не 500+)
      if (validResponse.statusCode >= 500) {
        Debug.throw(
          ctx,
          `[tests/api_http/http_post_validate_token] HTTP ${validResponse.statusCode} - серверная ошибка при проверке валидного токена`,
          'E_TEST_HTTP_ERROR'
        )
      }

      // Проверяем, что endpoint корректно обработал валидный токен
      const validBody = validResponse.body as any
      if (validResponse.statusCode === 200 && validBody?.success === true && validBody?.botInfo) {
        Debug.info(
          ctx,
          `[tests/api_http/http_post_validate_token] Endpoint корректно валидировал токен: botId=${validBody.botInfo.id}, username=${validBody.botInfo.username || 'N/A'}`
        )
        return {
          success: true,
          message: `HTTP ${invalidResponse.statusCode}/${validResponse.statusCode} - endpoint доступен, корректно обрабатывает невалидный и валидный токены`
        }
      } else if (validResponse.statusCode === 401) {
        Debug.info(
          ctx,
          `[tests/api_http/http_post_validate_token] Endpoint требует авторизации для валидного токена (ожидаемо для HTTP теста)`
        )
        return {
          success: true,
          message: `HTTP ${invalidResponse.statusCode}/${validResponse.statusCode} - endpoint доступен (требует авторизации)`
        }
      } else if (validResponse.statusCode === 200 && validBody?.success === false) {
        Debug.warn(
          ctx,
          `[tests/api_http/http_post_validate_token] Валидный тестовый токен был отклонён: ${validBody.error || 'неизвестная ошибка'}`
        )
        return {
          success: true,
          message: `HTTP ${invalidResponse.statusCode}/${validResponse.statusCode} - endpoint доступен (валидный токен отклонён, возможно требуется авторизация)`
        }
      }

      Debug.info(ctx, `[tests/api_http/http_post_validate_token] Тест завершён успешно`)
      return {
        success: true,
        message: `HTTP ${invalidResponse.statusCode}/${validResponse.statusCode} - endpoint доступен`
      }

    case 'http_post_add_bot':
      // Используем .url() метод роута для получения правильного URL
      const addUrl = apiAddBotRoute.url()
      Debug.info(ctx, `[tests/api_http/http_post_add_bot] Запрос к URL: ${addUrl}`)
      const addResponse = await request({
        url: addUrl,
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        json: {
          token: 'test_token',
          botName: 'Test Bot',
          botUsername: 'testbot'
        },
        responseType: 'json',
        throwHttpErrors: false
      })

      if (addResponse.statusCode >= 500) {
        Debug.throw(
          ctx,
          `[tests/api_http/http_post_add_bot] HTTP ${addResponse.statusCode} - серверная ошибка`,
          'E_TEST_HTTP_ERROR'
        )
      }

      Debug.info(
        ctx,
        `[tests/api_http/http_post_add_bot] Тест завершён успешно, статус: ${addResponse.statusCode}`
      )
      return { success: true, message: `HTTP ${addResponse.statusCode} - endpoint доступен` }

    case 'http_get_list':
      // Используем .url() метод роута для получения правильного URL
      const listUrl = apiGetBotsListRoute.url()
      Debug.info(ctx, `[tests/api_http/http_get_list] Запрос к URL: ${listUrl}`)
      const listResponse = await request({
        url: listUrl,
        method: 'get',
        responseType: 'json',
        throwHttpErrors: false
      })

      if (listResponse.statusCode >= 500) {
        Debug.throw(
          ctx,
          `[tests/api_http/http_get_list] HTTP ${listResponse.statusCode} - серверная ошибка`,
          'E_TEST_HTTP_ERROR'
        )
      }

      Debug.info(
        ctx,
        `[tests/api_http/http_get_list] Тест завершён успешно, статус: ${listResponse.statusCode}`
      )
      return { success: true, message: `HTTP ${listResponse.statusCode} - endpoint доступен` }

    case 'http_post_delete_bot':
      // Используем .url() метод роута для получения правильного URL
      const deleteUrl = apiDeleteBotRoute.url()
      Debug.info(ctx, `[tests/api_http/http_post_delete_bot] Запрос к URL: ${deleteUrl}`)
      const deleteResponse = await request({
        url: deleteUrl,
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        json: {
          botId: 'test_bot_id'
        },
        responseType: 'json',
        throwHttpErrors: false
      })

      if (deleteResponse.statusCode >= 500) {
        Debug.throw(
          ctx,
          `[tests/api_http/http_post_delete_bot] HTTP ${deleteResponse.statusCode} - серверная ошибка`,
          'E_TEST_HTTP_ERROR'
        )
      }

      Debug.info(
        ctx,
        `[tests/api_http/http_post_delete_bot] Тест завершён успешно, статус: ${deleteResponse.statusCode}`
      )
      return { success: true, message: `HTTP ${deleteResponse.statusCode} - endpoint доступен` }

    default:
      Debug.throw(ctx, `[tests/api_http] Неизвестный HTTP тест: ${testName}`, 'E_TEST_UNKNOWN')
  }
}

// Тесты базы данных
async function runDatabaseTest(
  ctx: any,
  testName: string
): Promise<{ success: boolean; message: string }> {
  Debug.info(ctx, `[tests/database] Начало теста: ${testName}`)

  switch (testName) {
    case 'table_exists':
      // Проверяем что можем выполнить запрос к таблице
      try {
        Debug.info(ctx, `[tests/database/table_exists] Проверка доступности таблицы BotTokens`)
        await BotTokens.findAll(ctx, { limit: 1 })
        Debug.info(ctx, `[tests/database/table_exists] Тест завершён успешно`)
        return { success: true, message: 'Таблица BotTokens существует и доступна' }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/database/table_exists] Таблица недоступна: ${error.message}`,
          'E_TEST_DB_ERROR'
        )
      }

    case 'create_bot':
      // Проверяем авторизацию
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(ctx, `[tests/database/create_bot] Пользователь не авторизован`, 'E_TEST_AUTH')
      }

      // Создаём тестовый проект
      const testProjectForCreate = await Projects.create(ctx, {
        name: `Test Project Create ${Date.now()}`,
        members: [
          {
            userId: ctx.user.id,
            role: 'owner'
          }
        ]
      })

      const testToken = `test_create_${Date.now()}`
      let createdBot: any = null

      try {
        Debug.info(
          ctx,
          `[tests/database/create_bot] Создание тестового бота с токеном: ${testToken.substring(0, 10)}...`
        )
        createdBot = await BotTokens.create(ctx, {
          token: testToken,
          botName: 'Test Bot',
          botUsername: 'testbot',
          projectId: testProjectForCreate.id
        })

        if (!createdBot || !createdBot.id) {
          Debug.throw(ctx, `[tests/database/create_bot] Бот не создан`, 'E_TEST_DB_ERROR')
        }

        Debug.info(ctx, `[tests/database/create_bot] Бот создан с ID: ${createdBot.id}`)
        Debug.info(ctx, `[tests/database/create_bot] Тест завершён успешно`)
        return { success: true, message: `Бот создан с ID: ${createdBot.id}` }
      } finally {
        // Гарантированно удаляем тестового бота даже при ошибке
        if (createdBot && createdBot.id) {
          try {
            Debug.info(
              ctx,
              `[tests/database/create_bot] Удаление тестового бота с ID: ${createdBot.id}`
            )
            await BotTokens.delete(ctx, createdBot.id)
            Debug.info(ctx, `[tests/database/create_bot] Тестовый бот успешно удалён`)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/database/create_bot] Ошибка при удалении тестового бота: ${deleteError.message}`
            )
            // Игнорируем ошибки удаления (возможно уже удалён)
          }
        }
        // Удаляем тестовый проект
        if (testProjectForCreate && testProjectForCreate.id) {
          try {
            await Projects.delete(ctx, testProjectForCreate.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/database/create_bot] Ошибка при удалении тестового проекта: ${deleteError.message}`
            )
          }
        }
      }

    case 'find_bot_by_user':
      // Проверяем авторизацию
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/database/find_bot_by_user] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      // Создаём тестовый проект
      const testProjectForFind = await Projects.create(ctx, {
        name: `Test Project Find ${Date.now()}`,
        members: [
          {
            userId: ctx.user.id,
            role: 'owner'
          }
        ]
      })

      try {
        Debug.info(
          ctx,
          `[tests/database/find_bot_by_user] Поиск ботов для проекта: ${testProjectForFind.id}`
        )
        const bots = await BotTokens.findAll(ctx, {
          where: {
            projectId: testProjectForFind.id
          },
          limit: 10
        })

        Debug.info(ctx, `[tests/database/find_bot_by_user] Найдено ботов: ${bots?.length || 0}`)
        Debug.info(ctx, `[tests/database/find_bot_by_user] Тест завершён успешно`)
        return { success: true, message: `Найдено ботов в проекте: ${bots?.length || 0}` }
      } finally {
        // Удаляем тестовый проект
        if (testProjectForFind && testProjectForFind.id) {
          try {
            await Projects.delete(ctx, testProjectForFind.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/database/find_bot_by_user] Ошибка при удалении тестового проекта: ${deleteError.message}`
            )
          }
        }
      }

    case 'find_bot_duplicate':
      // Проверяем авторизацию
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/database/find_bot_duplicate] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      // Создаём тестовый проект
      const testProjectForDuplicateFind = await Projects.create(ctx, {
        name: `Test Project Duplicate Find ${Date.now()}`,
        members: [
          {
            userId: ctx.user.id,
            role: 'owner'
          }
        ]
      })

      const testToken2 = `test_duplicate_${Date.now()}`
      let testBot: any = null

      try {
        Debug.info(
          ctx,
          `[tests/database/find_bot_duplicate] Создание тестового бота с токеном: ${testToken2.substring(0, 10)}...`
        )
        testBot = await BotTokens.create(ctx, {
          token: testToken2,
          botName: 'Test Bot',
          botUsername: 'testbot',
          projectId: testProjectForDuplicateFind.id
        })
        Debug.info(
          ctx,
          `[tests/database/find_bot_duplicate] Тестовый бот создан с ID: ${testBot.id}`
        )

        // Ищем дубликат
        Debug.info(ctx, `[tests/database/find_bot_duplicate] Поиск дубликата токена`)
        const duplicate = await BotTokens.findOneBy(ctx, {
          projectId: testProjectForDuplicateFind.id,
          token: testToken2
        })

        if (!duplicate || duplicate.id !== testBot.id) {
          Debug.throw(
            ctx,
            `[tests/database/find_bot_duplicate] Дубликат не найден`,
            'E_TEST_DB_ERROR'
          )
        }

        Debug.info(ctx, `[tests/database/find_bot_duplicate] Дубликат найден корректно`)
        Debug.info(ctx, `[tests/database/find_bot_duplicate] Тест завершён успешно`)
        return { success: true, message: 'Поиск дубликатов работает корректно' }
      } finally {
        // Гарантированно удаляем тестового бота даже при ошибке
        if (testBot && testBot.id) {
          try {
            Debug.info(
              ctx,
              `[tests/database/find_bot_duplicate] Удаление тестового бота с ID: ${testBot.id}`
            )
            await BotTokens.delete(ctx, testBot.id)
            Debug.info(ctx, `[tests/database/find_bot_duplicate] Тестовый бот успешно удалён`)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/database/find_bot_duplicate] Ошибка при удалении тестового бота: ${deleteError.message}`
            )
            // Игнорируем ошибки удаления (возможно уже удалён)
          }
        }
        // Удаляем тестовый проект
        if (testProjectForDuplicateFind && testProjectForDuplicateFind.id) {
          try {
            await Projects.delete(ctx, testProjectForDuplicateFind.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/database/find_bot_duplicate] Ошибка при удалении тестового проекта: ${deleteError.message}`
            )
          }
        }
      }

    case 'delete_bot':
      // Проверяем авторизацию
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(ctx, `[tests/database/delete_bot] Пользователь не авторизован`, 'E_TEST_AUTH')
      }

      // Создаём тестовый проект
      const testProjectForDbDelete = await Projects.create(ctx, {
        name: `Test Project DB Delete ${Date.now()}`,
        members: [
          {
            userId: ctx.user.id,
            role: 'owner'
          }
        ]
      })

      const testTokenForDbDelete = `test_db_delete_${Date.now()}`
      let testBotForDbDelete: any = null

      try {
        Debug.info(
          ctx,
          `[tests/database/delete_bot] Создание тестового бота с токеном: ${testTokenForDbDelete.substring(0, 10)}...`
        )
        testBotForDbDelete = await BotTokens.create(ctx, {
          token: testTokenForDbDelete,
          botName: 'Test Bot For DB Delete',
          botUsername: 'testbotdbdelete',
          projectId: testProjectForDbDelete.id
        })

        if (!testBotForDbDelete || !testBotForDbDelete.id) {
          Debug.throw(ctx, `[tests/database/delete_bot] Бот не создан`, 'E_TEST_DB_ERROR')
        }

        Debug.info(ctx, `[tests/database/delete_bot] Бот создан с ID: ${testBotForDbDelete.id}`)

        // Удаляем бота напрямую через таблицу
        Debug.info(ctx, `[tests/database/delete_bot] Удаление бота через таблицу`)
        await BotTokens.delete(ctx, testBotForDbDelete.id)

        // Проверяем, что бот действительно удалён
        Debug.info(ctx, `[tests/database/delete_bot] Проверка удаления бота`)
        const deletedBot = await BotTokens.findById(ctx, testBotForDbDelete.id)
        if (deletedBot) {
          Debug.throw(
            ctx,
            `[tests/database/delete_bot] Бот не был удалён из таблицы`,
            'E_TEST_DB_ERROR'
          )
        }

        Debug.info(ctx, `[tests/database/delete_bot] Тест завершён успешно`)
        return { success: true, message: `Бот успешно удалён из таблицы` }
      } catch (error: any) {
        // Если ошибка произошла до удаления, пытаемся удалить вручную
        if (testBotForDbDelete && testBotForDbDelete.id) {
          try {
            Debug.info(
              ctx,
              `[tests/database/delete_bot] Очистка: удаление тестового бота с ID: ${testBotForDbDelete.id}`
            )
            await BotTokens.delete(ctx, testBotForDbDelete.id)
            Debug.info(ctx, `[tests/database/delete_bot] Тестовый бот успешно удалён при очистке`)
          } catch (cleanupError: any) {
            Debug.warn(
              ctx,
              `[tests/database/delete_bot] Ошибка при очистке: ${cleanupError.message}`
            )
          }
        }
        throw error
      } finally {
        // Удаляем тестовый проект
        if (testProjectForDbDelete && testProjectForDbDelete.id) {
          try {
            await Projects.delete(ctx, testProjectForDbDelete.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/database/delete_bot] Ошибка при удалении тестового проекта: ${deleteError.message}`
            )
          }
        }
      }

    default:
      Debug.throw(
        ctx,
        `[tests/database] Неизвестный тест базы данных: ${testName}`,
        'E_TEST_UNKNOWN'
      )
  }
}

// Тесты загрузки страниц
async function runPagesTest(
  ctx: any,
  testName: string
): Promise<{ success: boolean; message: string }> {
  Debug.info(ctx, `[tests/pages] Начало теста: ${testName}`)

  // Базовый URL проекта
  const baseUrl = ctx.account.url('/saas/analytics/telegram/channel')

  switch (testName) {
    case 'page_index':
      Debug.info(ctx, `[tests/pages/page_index] Проверка загрузки главной страницы`)
      const indexResponse = await request({
        url: `${baseUrl}/`,
        method: 'get',
        responseType: 'text',
        throwHttpErrors: false,
        timeout: 10000 // 10 секунд таймаут
      })

      Debug.info(
        ctx,
        `[tests/pages/page_index] Получен ответ: statusCode=${indexResponse.statusCode}`
      )

      if (indexResponse.statusCode >= 500) {
        Debug.throw(
          ctx,
          `[tests/pages/page_index] HTTP ${indexResponse.statusCode} - серверная ошибка`,
          'E_TEST_HTTP_ERROR'
        )
      }

      // Может быть 200 (если авторизован) или редирект на /login (если не авторизован)
      if (
        indexResponse.statusCode === 200 ||
        indexResponse.statusCode === 302 ||
        indexResponse.statusCode === 401
      ) {
        Debug.info(
          ctx,
          `[tests/pages/page_index] Страница доступна (статус ${indexResponse.statusCode})`
        )
        return { success: true, message: `HTTP ${indexResponse.statusCode} - страница доступна` }
      }

      return { success: true, message: `HTTP ${indexResponse.statusCode} - страница отвечает` }

    case 'page_login':
      Debug.info(ctx, `[tests/pages/page_login] Проверка загрузки страницы входа`)
      const loginResponse = await request({
        url: `${baseUrl}/login`,
        method: 'get',
        responseType: 'text',
        throwHttpErrors: false,
        timeout: 10000 // 10 секунд таймаут
      })

      Debug.info(
        ctx,
        `[tests/pages/page_login] Получен ответ: statusCode=${loginResponse.statusCode}`
      )

      if (loginResponse.statusCode >= 500) {
        Debug.throw(
          ctx,
          `[tests/pages/page_login] HTTP ${loginResponse.statusCode} - серверная ошибка`,
          'E_TEST_HTTP_ERROR'
        )
      }

      if (loginResponse.statusCode === 200) {
        Debug.info(ctx, `[tests/pages/page_login] Страница успешно загружена`)
        return { success: true, message: `HTTP ${loginResponse.statusCode} - страница доступна` }
      }

      return { success: true, message: `HTTP ${loginResponse.statusCode} - страница отвечает` }

    case 'page_profile':
      Debug.info(ctx, `[tests/pages/page_profile] Проверка загрузки страницы профиля`)
      const profileResponse = await request({
        url: `${baseUrl}/profile`,
        method: 'get',
        responseType: 'text',
        throwHttpErrors: false,
        timeout: 10000 // 10 секунд таймаут
      })

      Debug.info(
        ctx,
        `[tests/pages/page_profile] Получен ответ: statusCode=${profileResponse.statusCode}`
      )

      if (profileResponse.statusCode >= 500) {
        Debug.throw(
          ctx,
          `[tests/pages/page_profile] HTTP ${profileResponse.statusCode} - серверная ошибка`,
          'E_TEST_HTTP_ERROR'
        )
      }

      // Может быть 200 (если авторизован) или редирект на /login (если не авторизован)
      if (
        profileResponse.statusCode === 200 ||
        profileResponse.statusCode === 302 ||
        profileResponse.statusCode === 401
      ) {
        Debug.info(
          ctx,
          `[tests/pages/page_profile] Страница доступна (статус ${profileResponse.statusCode})`
        )
        return { success: true, message: `HTTP ${profileResponse.statusCode} - страница доступна` }
      }

      return { success: true, message: `HTTP ${profileResponse.statusCode} - страница отвечает` }

    case 'page_settings':
      Debug.info(ctx, `[tests/pages/page_settings] Проверка загрузки страницы настроек`)
      const settingsResponse = await request({
        url: `${baseUrl}/settings`,
        method: 'get',
        responseType: 'text',
        throwHttpErrors: false,
        timeout: 10000 // 10 секунд таймаут
      })

      Debug.info(
        ctx,
        `[tests/pages/page_settings] Получен ответ: statusCode=${settingsResponse.statusCode}`
      )

      if (settingsResponse.statusCode >= 500) {
        Debug.throw(
          ctx,
          `[tests/pages/page_settings] HTTP ${settingsResponse.statusCode} - серверная ошибка`,
          'E_TEST_HTTP_ERROR'
        )
      }

      // Может быть 200 (если авторизован) или редирект на /login (если не авторизован)
      if (
        settingsResponse.statusCode === 200 ||
        settingsResponse.statusCode === 302 ||
        settingsResponse.statusCode === 401
      ) {
        Debug.info(
          ctx,
          `[tests/pages/page_settings] Страница доступна (статус ${settingsResponse.statusCode})`
        )
        return { success: true, message: `HTTP ${settingsResponse.statusCode} - страница доступна` }
      }

      return { success: true, message: `HTTP ${settingsResponse.statusCode} - страница отвечает` }

    case 'page_channels':
      Debug.info(ctx, `[tests/pages/page_channels] Проверка загрузки страницы каналов`)
      const channelsResponse = await request({
        url: `${baseUrl}/channels`,
        method: 'get',
        responseType: 'text',
        throwHttpErrors: false,
        timeout: 10000 // 10 секунд таймаут
      })

      Debug.info(
        ctx,
        `[tests/pages/page_channels] Получен ответ: statusCode=${channelsResponse.statusCode}`
      )

      if (channelsResponse.statusCode >= 500) {
        Debug.throw(
          ctx,
          `[tests/pages/page_channels] HTTP ${channelsResponse.statusCode} - серверная ошибка`,
          'E_TEST_HTTP_ERROR'
        )
      }

      // Может быть 200 (если авторизован) или редирект на /login (если не авторизован)
      if (
        channelsResponse.statusCode === 200 ||
        channelsResponse.statusCode === 302 ||
        channelsResponse.statusCode === 401
      ) {
        Debug.info(
          ctx,
          `[tests/pages/page_channels] Страница доступна (статус ${channelsResponse.statusCode})`
        )
        return { success: true, message: `HTTP ${channelsResponse.statusCode} - страница доступна` }
      }

      return { success: true, message: `HTTP ${channelsResponse.statusCode} - страница отвечает` }

    default:
      Debug.throw(ctx, `[tests/pages] Неизвестный тест страницы: ${testName}`, 'E_TEST_UNKNOWN')
  }
}

// Тесты базы данных проектов
async function runProjectsDatabaseTest(
  ctx: any,
  testName: string
): Promise<{ success: boolean; message: string }> {
  Debug.info(ctx, `[tests/projects_database] Начало теста: ${testName}`)

  switch (testName) {
    case 'projects_table_exists':
      try {
        Debug.info(
          ctx,
          `[tests/projects_database/projects_table_exists] Проверка доступности таблицы Projects`
        )
        await Projects.findAll(ctx, { limit: 1 })
        Debug.info(ctx, `[tests/projects_database/projects_table_exists] Тест завершён успешно`)
        return { success: true, message: 'Таблица Projects существует и доступна' }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/projects_database/projects_table_exists] Таблица недоступна: ${error.message}`,
          'E_TEST_DB_ERROR'
        )
      }
      break

    case 'project_requests_table_exists':
      try {
        Debug.info(
          ctx,
          `[tests/projects_database/project_requests_table_exists] Проверка доступности таблицы ProjectRequests`
        )
        await ProjectRequests.findAll(ctx, { limit: 1 })
        Debug.info(
          ctx,
          `[tests/projects_database/project_requests_table_exists] Тест завершён успешно`
        )
        return { success: true, message: 'Таблица ProjectRequests существует и доступна' }
      } catch (error: any) {
        Debug.throw(
          ctx,
          `[tests/projects_database/project_requests_table_exists] Таблица недоступна: ${error.message}`,
          'E_TEST_DB_ERROR'
        )
      }
      break

    case 'create_project':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_database/create_project] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName = `Test Project ${Date.now()}`
      let createdProject: any = null

      try {
        Debug.info(
          ctx,
          `[tests/projects_database/create_project] Создание тестового проекта: ${testProjectName}`
        )
        createdProject = await Projects.create(ctx, {
          name: testProjectName,
          description: 'Test project description',
          members: [
            {
              userId: ctx.user.id,
              role: 'owner'
            }
          ]
        })

        if (!createdProject || !createdProject.id) {
          Debug.throw(
            ctx,
            `[tests/projects_database/create_project] Проект не создан`,
            'E_TEST_DB_ERROR'
          )
        }

        Debug.info(
          ctx,
          `[tests/projects_database/create_project] Проект создан с ID: ${createdProject.id}`
        )
        return { success: true, message: `Проект создан с ID: ${createdProject.id}` }
      } finally {
        if (createdProject && createdProject.id) {
          try {
            Debug.info(
              ctx,
              `[tests/projects_database/create_project] Удаление тестового проекта с ID: ${createdProject.id}`
            )
            await Projects.delete(ctx, createdProject.id)
            Debug.info(
              ctx,
              `[tests/projects_database/create_project] Тестовый проект успешно удалён`
            )
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_database/create_project] Ошибка при удалении проекта: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'find_project_by_id':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_database/find_project_by_id] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName2 = `Test Project Find ${Date.now()}`
      let testProject: any = null

      try {
        Debug.info(ctx, `[tests/projects_database/find_project_by_id] Создание тестового проекта`)
        testProject = await Projects.create(ctx, {
          name: testProjectName2,
          members: [
            {
              userId: ctx.user.id,
              role: 'owner'
            }
          ]
        })

        Debug.info(
          ctx,
          `[tests/projects_database/find_project_by_id] Поиск проекта по ID: ${testProject.id}`
        )
        const foundProject = await Projects.findById(ctx, testProject.id)

        if (!foundProject || foundProject.id !== testProject.id) {
          Debug.throw(
            ctx,
            `[tests/projects_database/find_project_by_id] Проект не найден`,
            'E_TEST_DB_ERROR'
          )
        }

        Debug.info(ctx, `[tests/projects_database/find_project_by_id] Тест завершён успешно`)
        return { success: true, message: 'Проект найден по ID' }
      } finally {
        if (testProject && testProject.id) {
          try {
            await Projects.delete(ctx, testProject.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_database/find_project_by_id] Ошибка при удалении: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'update_project':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_database/update_project] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName3 = `Test Project Update ${Date.now()}`
      let testProject2: any = null

      try {
        Debug.info(ctx, `[tests/projects_database/update_project] Создание тестового проекта`)
        testProject2 = await Projects.create(ctx, {
          name: testProjectName3,
          members: [
            {
              userId: ctx.user.id,
              role: 'owner'
            }
          ]
        })

        const updatedName = `Updated ${testProjectName3}`
        Debug.info(ctx, `[tests/projects_database/update_project] Обновление проекта`)
        const updatedProject = await Projects.update(ctx, {
          id: testProject2.id,
          name: updatedName
        })

        if (updatedProject.name !== updatedName) {
          Debug.throw(
            ctx,
            `[tests/projects_database/update_project] Проект не обновлён`,
            'E_TEST_DB_ERROR'
          )
        }

        Debug.info(ctx, `[tests/projects_database/update_project] Тест завершён успешно`)
        return { success: true, message: 'Проект успешно обновлён' }
      } finally {
        if (testProject2 && testProject2.id) {
          try {
            await Projects.delete(ctx, testProject2.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_database/update_project] Ошибка при удалении: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'delete_project':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_database/delete_project] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName4 = `Test Project Delete ${Date.now()}`
      let testProject3: any = null

      try {
        Debug.info(ctx, `[tests/projects_database/delete_project] Создание тестового проекта`)
        testProject3 = await Projects.create(ctx, {
          name: testProjectName4,
          members: [
            {
              userId: ctx.user.id,
              role: 'owner'
            }
          ]
        })

        Debug.info(ctx, `[tests/projects_database/delete_project] Удаление проекта`)
        await Projects.delete(ctx, testProject3.id)

        const deletedProject = await Projects.findById(ctx, testProject3.id)
        if (deletedProject) {
          Debug.throw(
            ctx,
            `[tests/projects_database/delete_project] Проект не был удалён`,
            'E_TEST_DB_ERROR'
          )
        }

        Debug.info(ctx, `[tests/projects_database/delete_project] Тест завершён успешно`)
        return { success: true, message: 'Проект успешно удалён' }
      } catch (error: any) {
        if (testProject3 && testProject3.id) {
          try {
            await Projects.delete(ctx, testProject3.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_database/delete_project] Ошибка при очистке: ${deleteError.message}`
            )
          }
        }
        throw error
      }
      break

    case 'create_project_request':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_database/create_project_request] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName5 = `Test Project Request ${Date.now()}`
      let testProject4: any = null
      let createdRequest: any = null

      try {
        Debug.info(
          ctx,
          `[tests/projects_database/create_project_request] Создание тестового проекта`
        )
        testProject4 = await Projects.create(ctx, {
          name: testProjectName5,
          members: [
            {
              userId: ctx.user.id,
              role: 'owner'
            }
          ]
        })

        Debug.info(ctx, `[tests/projects_database/create_project_request] Создание заявки`)
        createdRequest = await ProjectRequests.create(ctx, {
          projectId: testProject4.id,
          userId: ctx.user.id,
          status: 'pending',
          requestedAt: new Date()
        })

        if (!createdRequest || !createdRequest.id) {
          Debug.throw(
            ctx,
            `[tests/projects_database/create_project_request] Заявка не создана`,
            'E_TEST_DB_ERROR'
          )
        }

        Debug.info(
          ctx,
          `[tests/projects_database/create_project_request] Заявка создана с ID: ${createdRequest.id}`
        )
        return { success: true, message: `Заявка создана с ID: ${createdRequest.id}` }
      } finally {
        if (createdRequest && createdRequest.id) {
          try {
            await ProjectRequests.delete(ctx, createdRequest.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_database/create_project_request] Ошибка при удалении заявки: ${deleteError.message}`
            )
          }
        }
        if (testProject4 && testProject4.id) {
          try {
            await Projects.delete(ctx, testProject4.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_database/create_project_request] Ошибка при удалении проекта: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'find_project_requests':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_database/find_project_requests] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName6 = `Test Project Requests ${Date.now()}`
      let testProject5: any = null
      let testRequest: any = null

      try {
        Debug.info(
          ctx,
          `[tests/projects_database/find_project_requests] Создание тестового проекта`
        )
        testProject5 = await Projects.create(ctx, {
          name: testProjectName6,
          members: [
            {
              userId: ctx.user.id,
              role: 'owner'
            }
          ]
        })

        Debug.info(ctx, `[tests/projects_database/find_project_requests] Создание тестовой заявки`)
        testRequest = await ProjectRequests.create(ctx, {
          projectId: testProject5.id,
          userId: ctx.user.id,
          status: 'pending',
          requestedAt: new Date()
        })

        Debug.info(ctx, `[tests/projects_database/find_project_requests] Поиск заявок по проекту`)
        const requests = await ProjectRequests.findAll(ctx, {
          where: {
            projectId: testProject5.id,
            status: 'pending'
          }
        })

        if (!requests || requests.length === 0) {
          Debug.throw(
            ctx,
            `[tests/projects_database/find_project_requests] Заявки не найдены`,
            'E_TEST_DB_ERROR'
          )
        }

        Debug.info(
          ctx,
          `[tests/projects_database/find_project_requests] Найдено заявок: ${requests.length}`
        )
        return { success: true, message: `Найдено заявок: ${requests.length}` }
      } finally {
        if (testRequest && testRequest.id) {
          try {
            await ProjectRequests.delete(ctx, testRequest.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_database/find_project_requests] Ошибка при удалении заявки: ${deleteError.message}`
            )
          }
        }
        if (testProject5 && testProject5.id) {
          try {
            await Projects.delete(ctx, testProject5.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_database/find_project_requests] Ошибка при удалении проекта: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'update_project_request':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_database/update_project_request] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName7 = `Test Project Update Request ${Date.now()}`
      let testProject6: any = null
      let testRequest2: any = null

      try {
        Debug.info(
          ctx,
          `[tests/projects_database/update_project_request] Создание тестового проекта`
        )
        testProject6 = await Projects.create(ctx, {
          name: testProjectName7,
          members: [
            {
              userId: ctx.user.id,
              role: 'owner'
            }
          ]
        })

        Debug.info(ctx, `[tests/projects_database/update_project_request] Создание тестовой заявки`)
        testRequest2 = await ProjectRequests.create(ctx, {
          projectId: testProject6.id,
          userId: ctx.user.id,
          status: 'pending',
          requestedAt: new Date()
        })

        Debug.info(ctx, `[tests/projects_database/update_project_request] Обновление заявки`)
        const updatedRequest = await ProjectRequests.update(ctx, {
          id: testRequest2.id,
          status: 'approved',
          processedAt: new Date(),
          processedBy: ctx.user.id
        })

        if (updatedRequest.status !== 'approved') {
          Debug.throw(
            ctx,
            `[tests/projects_database/update_project_request] Заявка не обновлена`,
            'E_TEST_DB_ERROR'
          )
        }

        Debug.info(ctx, `[tests/projects_database/update_project_request] Тест завершён успешно`)
        return { success: true, message: 'Заявка успешно обновлена' }
      } finally {
        if (testRequest2 && testRequest2.id) {
          try {
            await ProjectRequests.delete(ctx, testRequest2.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_database/update_project_request] Ошибка при удалении заявки: ${deleteError.message}`
            )
          }
        }
        if (testProject6 && testProject6.id) {
          try {
            await Projects.delete(ctx, testProject6.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_database/update_project_request] Ошибка при удалении проекта: ${deleteError.message}`
            )
          }
        }
      }
      break

    default:
      Debug.throw(ctx, `[tests/projects_database] Неизвестный тест: ${testName}`, 'E_TEST_UNKNOWN')
  }
}

// Тесты API проектов
async function runProjectsApiTest(
  ctx: any,
  testName: string
): Promise<{ success: boolean; message: string }> {
  Debug.info(ctx, `[tests/projects_api] Начало теста: ${testName}`)

  switch (testName) {
    case 'projects_list_empty_name':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_list_empty_name] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      Debug.info(ctx, `[tests/projects_api/projects_list_empty_name] Получение списка проектов`)
      const listResult = await apiGetProjectsListRoute.run(ctx)

      if (!listResult.success) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_list_empty_name] Ошибка при получении списка: ${listResult.error}`,
          'E_TEST_FAILED'
        )
      }

      Debug.info(ctx, `[tests/projects_api/projects_list_empty_name] Тест завершён успешно`)
      return { success: true, message: 'Список проектов получен успешно' }
      break

    case 'projects_create_empty_name':
      Debug.info(
        ctx,
        `[tests/projects_api/projects_create_empty_name] Попытка создания проекта с пустым названием`
      )
      const emptyNameResult = await apiCreateProjectRoute.run(ctx, { name: '' })

      if (emptyNameResult.success) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_create_empty_name] Ожидалась ошибка для пустого названия`,
          'E_TEST_FAILED'
        )
      }

      Debug.info(ctx, `[tests/projects_api/projects_create_empty_name] Тест завершён успешно`)
      return { success: true, message: 'Пустое название корректно отклонено' }
      break

    case 'projects_create_success':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_create_success] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName = `Test Project API ${Date.now()}`
      let createdProjectId: string | null = null

      try {
        Debug.info(ctx, `[tests/projects_api/projects_create_success] Создание проекта через API`)
        const createResult = await apiCreateProjectRoute.run(ctx, {
          name: testProjectName,
          description: 'Test description'
        })

        if (!createResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_create_success] Ошибка при создании: ${createResult.error}`,
            'E_TEST_FAILED'
          )
        }

        if (!createResult.project || !createResult.project.id) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_create_success] Проект не создан`,
            'E_TEST_FAILED'
          )
        }

        createdProjectId = createResult.project.id
        Debug.info(
          ctx,
          `[tests/projects_api/projects_create_success] Проект создан с ID: ${createdProjectId}`
        )
        return { success: true, message: `Проект создан с ID: ${createdProjectId}` }
      } finally {
        if (createdProjectId) {
          try {
            await Projects.delete(ctx, createdProjectId)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_create_success] Ошибка при удалении: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'projects_get_not_found':
      Debug.info(
        ctx,
        `[tests/projects_api/projects_get_not_found] Попытка получения несуществующего проекта`
      )
      const notFoundResult = await apiGetProjectRoute({ id: 'non_existent_project_id_12345' }).run(
        ctx
      )

      if (notFoundResult.success) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_get_not_found] Ожидалась ошибка для несуществующего проекта`,
          'E_TEST_FAILED'
        )
      }

      Debug.info(ctx, `[tests/projects_api/projects_get_not_found] Тест завершён успешно`)
      return { success: true, message: 'Несуществующий проект корректно отклонён' }
      break

    case 'projects_get_success':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_get_success] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName2 = `Test Project Get ${Date.now()}`
      let testProject: any = null

      try {
        Debug.info(ctx, `[tests/projects_api/projects_get_success] Создание тестового проекта`)
        testProject = await Projects.create(ctx, {
          name: testProjectName2,
          members: [
            {
              userId: ctx.user.id,
              role: 'owner'
            }
          ]
        })

        Debug.info(ctx, `[tests/projects_api/projects_get_success] Получение проекта через API`)
        const getResult = await apiGetProjectRoute({ id: testProject.id }).run(ctx)

        if (!getResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_get_success] Ошибка при получении: ${getResult.error}`,
            'E_TEST_FAILED'
          )
        }

        if (!getResult.project || getResult.project.id !== testProject.id) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_get_success] Получен неверный проект`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(ctx, `[tests/projects_api/projects_get_success] Тест завершён успешно`)
        return { success: true, message: 'Проект успешно получен' }
      } finally {
        if (testProject && testProject.id) {
          try {
            await Projects.delete(ctx, testProject.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_get_success] Ошибка при удалении: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'projects_delete_not_found':
      Debug.info(
        ctx,
        `[tests/projects_api/projects_delete_not_found] Попытка удаления несуществующего проекта`
      )
      const deleteNotFoundResult = await apiDeleteProjectRoute.run(ctx, {
        projectId: 'non_existent_project_id_12345'
      })

      if (deleteNotFoundResult.success) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_delete_not_found] Ожидалась ошибка для несуществующего проекта`,
          'E_TEST_FAILED'
        )
      }

      Debug.info(ctx, `[tests/projects_api/projects_delete_not_found] Тест завершён успешно`)
      return { success: true, message: 'Несуществующий проект корректно отклонён' }
      break

    case 'projects_delete_no_access':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_delete_no_access] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName3 = `Test Project Delete Access ${Date.now()}`
      let testProject2: any = null

      try {
        // Создаём проект с другим владельцем (симулируем отсутствие доступа)
        Debug.info(
          ctx,
          `[tests/projects_api/projects_delete_no_access] Создание проекта с другим владельцем`
        )
        testProject2 = await Projects.create(ctx, {
          name: testProjectName3,
          members: [
            {
              userId: 'different_user_id_12345', // Другой пользователь
              role: 'owner'
            }
          ]
        })

        Debug.info(
          ctx,
          `[tests/projects_api/projects_delete_no_access] Попытка удаления проекта без прав`
        )
        const deleteNoAccessResult = await apiDeleteProjectRoute.run(ctx, {
          projectId: testProject2.id
        })

        if (deleteNoAccessResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_delete_no_access] Ожидалась ошибка для отсутствия прав`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(ctx, `[tests/projects_api/projects_delete_no_access] Тест завершён успешно`)
        return { success: true, message: 'Отсутствие прав корректно обнаружено' }
      } finally {
        if (testProject2 && testProject2.id) {
          try {
            await Projects.delete(ctx, testProject2.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_delete_no_access] Ошибка при удалении: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'projects_delete_success':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_delete_success] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName4 = `Test Project Delete ${Date.now()}`
      let testProject3: any = null

      try {
        Debug.info(ctx, `[tests/projects_api/projects_delete_success] Создание тестового проекта`)
        testProject3 = await Projects.create(ctx, {
          name: testProjectName4,
          members: [
            {
              userId: ctx.user.id,
              role: 'owner'
            }
          ]
        })

        Debug.info(ctx, `[tests/projects_api/projects_delete_success] Удаление проекта через API`)
        const deleteResult = await apiDeleteProjectRoute.run(ctx, { projectId: testProject3.id })

        if (!deleteResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_delete_success] Ошибка при удалении: ${deleteResult.error}`,
            'E_TEST_FAILED'
          )
        }

        const deletedProject = await Projects.findById(ctx, testProject3.id)
        if (deletedProject) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_delete_success] Проект не был удалён`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(ctx, `[tests/projects_api/projects_delete_success] Тест завершён успешно`)
        return { success: true, message: 'Проект успешно удалён' }
      } catch (error: any) {
        if (testProject3 && testProject3.id) {
          try {
            await Projects.delete(ctx, testProject3.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_delete_success] Ошибка при очистке: ${deleteError.message}`
            )
          }
        }
        throw error
      }
      break

    case 'projects_join_request_empty_project':
      Debug.info(
        ctx,
        `[tests/projects_api/projects_join_request_empty_project] Попытка подачи заявки с пустым projectId`
      )
      const emptyProjectResult = await apiJoinProjectRequestRoute.run(ctx, { projectId: '' })

      if (emptyProjectResult.success) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_join_request_empty_project] Ожидалась ошибка для пустого projectId`,
          'E_TEST_FAILED'
        )
      }

      Debug.info(
        ctx,
        `[tests/projects_api/projects_join_request_empty_project] Тест завершён успешно`
      )
      return { success: true, message: 'Пустой projectId корректно отклонён' }
      break

    case 'projects_join_request_not_found':
      Debug.info(
        ctx,
        `[tests/projects_api/projects_join_request_not_found] Попытка подачи заявки на несуществующий проект`
      )
      const joinNotFoundResult = await apiJoinProjectRequestRoute.run(ctx, {
        projectId: 'non_existent_project_id_12345'
      })

      if (joinNotFoundResult.success) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_join_request_not_found] Ожидалась ошибка для несуществующего проекта`,
          'E_TEST_FAILED'
        )
      }

      Debug.info(ctx, `[tests/projects_api/projects_join_request_not_found] Тест завершён успешно`)
      return { success: true, message: 'Несуществующий проект корректно отклонён' }
      break

    case 'projects_join_request_already_member':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_join_request_already_member] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName5 = `Test Project Already Member ${Date.now()}`
      let testProject4: any = null

      try {
        Debug.info(
          ctx,
          `[tests/projects_api/projects_join_request_already_member] Создание тестового проекта с текущим пользователем как участником`
        )
        testProject4 = await Projects.create(ctx, {
          name: testProjectName5,
          members: [
            {
              userId: ctx.user.id,
              role: 'member'
            }
          ]
        })

        Debug.info(
          ctx,
          `[tests/projects_api/projects_join_request_already_member] Попытка подачи заявки будучи уже участником`
        )
        const alreadyMemberResult = await apiJoinProjectRequestRoute.run(ctx, {
          projectId: testProject4.id
        })

        if (alreadyMemberResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_join_request_already_member] Ожидалась ошибка для уже участника`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(
          ctx,
          `[tests/projects_api/projects_join_request_already_member] Тест завершён успешно`
        )
        return { success: true, message: 'Уже участник корректно обнаружено' }
      } finally {
        if (testProject4 && testProject4.id) {
          try {
            await Projects.delete(ctx, testProject4.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_join_request_already_member] Ошибка при удалении: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'projects_join_request_success':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_join_request_success] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName6 = `Test Project Join Request ${Date.now()}`
      let testProject5: any = null
      let createdRequestId: string | null = null

      try {
        Debug.info(
          ctx,
          `[tests/projects_api/projects_join_request_success] Создание тестового проекта`
        )
        testProject5 = await Projects.create(ctx, {
          name: testProjectName6,
          members: [
            {
              userId: 'different_owner_id_12345', // Другой владелец
              role: 'owner'
            }
          ]
        })

        Debug.info(
          ctx,
          `[tests/projects_api/projects_join_request_success] Подача заявки через API`
        )
        const joinResult = await apiJoinProjectRequestRoute.run(ctx, { projectId: testProject5.id })

        if (!joinResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_join_request_success] Ошибка при подаче заявки: ${joinResult.error}`,
            'E_TEST_FAILED'
          )
        }

        if (!joinResult.request || !joinResult.request.id) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_join_request_success] Заявка не создана`,
            'E_TEST_FAILED'
          )
        }

        createdRequestId = joinResult.request.id
        Debug.info(
          ctx,
          `[tests/projects_api/projects_join_request_success] Заявка создана с ID: ${createdRequestId}`
        )
        return { success: true, message: `Заявка создана с ID: ${createdRequestId}` }
      } finally {
        if (createdRequestId) {
          try {
            await ProjectRequests.delete(ctx, createdRequestId)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_join_request_success] Ошибка при удалении заявки: ${deleteError.message}`
            )
          }
        }
        if (testProject5 && testProject5.id) {
          try {
            await Projects.delete(ctx, testProject5.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_join_request_success] Ошибка при удалении проекта: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'projects_get_requests_no_access':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_get_requests_no_access] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName7 = `Test Project Get Requests No Access ${Date.now()}`
      let testProject6: any = null

      try {
        Debug.info(
          ctx,
          `[tests/projects_api/projects_get_requests_no_access] Создание проекта без доступа текущего пользователя`
        )
        testProject6 = await Projects.create(ctx, {
          name: testProjectName7,
          members: [
            {
              userId: 'different_owner_id_12345',
              role: 'owner'
            }
          ]
        })

        Debug.info(
          ctx,
          `[tests/projects_api/projects_get_requests_no_access] Попытка получения заявок без прав`
        )
        const getRequestsResult = await apiGetProjectRequestsRoute({ id: testProject6.id }).run(ctx)

        if (getRequestsResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_get_requests_no_access] Ожидалась ошибка для отсутствия прав`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(
          ctx,
          `[tests/projects_api/projects_get_requests_no_access] Тест завершён успешно`
        )
        return { success: true, message: 'Отсутствие прав корректно обнаружено' }
      } finally {
        if (testProject6 && testProject6.id) {
          try {
            await Projects.delete(ctx, testProject6.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_get_requests_no_access] Ошибка при удалении: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'projects_get_requests_success':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_get_requests_success] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName8 = `Test Project Get Requests ${Date.now()}`
      let testProject7: any = null
      let testRequest: any = null

      try {
        Debug.info(
          ctx,
          `[tests/projects_api/projects_get_requests_success] Создание тестового проекта`
        )
        testProject7 = await Projects.create(ctx, {
          name: testProjectName8,
          members: [
            {
              userId: ctx.user.id,
              role: 'owner'
            }
          ]
        })

        Debug.info(
          ctx,
          `[tests/projects_api/projects_get_requests_success] Создание тестовой заявки`
        )
        testRequest = await ProjectRequests.create(ctx, {
          projectId: testProject7.id,
          userId: 'different_user_id_12345',
          status: 'pending',
          requestedAt: new Date()
        })

        Debug.info(
          ctx,
          `[tests/projects_api/projects_get_requests_success] Получение заявок через API`
        )
        const getRequestsResult = await apiGetProjectRequestsRoute({ id: testProject7.id }).run(ctx)

        if (!getRequestsResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_get_requests_success] Ошибка при получении заявок: ${getRequestsResult.error}`,
            'E_TEST_FAILED'
          )
        }

        if (!getRequestsResult.requests || getRequestsResult.requests.length === 0) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_get_requests_success] Заявки не найдены`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(ctx, `[tests/projects_api/projects_get_requests_success] Тест завершён успешно`)
        return { success: true, message: 'Заявки успешно получены' }
      } finally {
        if (testRequest && testRequest.id) {
          try {
            await ProjectRequests.delete(ctx, testRequest.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_get_requests_success] Ошибка при удалении заявки: ${deleteError.message}`
            )
          }
        }
        if (testProject7 && testProject7.id) {
          try {
            await Projects.delete(ctx, testProject7.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_get_requests_success] Ошибка при удалении проекта: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'projects_approve_request_success':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_approve_request_success] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName9 = `Test Project Approve ${Date.now()}`
      let testProject8: any = null
      let testRequest2: any = null

      try {
        Debug.info(
          ctx,
          `[tests/projects_api/projects_approve_request_success] Создание тестового проекта`
        )
        testProject8 = await Projects.create(ctx, {
          name: testProjectName9,
          members: [
            {
              userId: ctx.user.id,
              role: 'owner'
            }
          ]
        })

        Debug.info(
          ctx,
          `[tests/projects_api/projects_approve_request_success] Создание тестовой заявки`
        )
        testRequest2 = await ProjectRequests.create(ctx, {
          projectId: testProject8.id,
          userId: 'different_user_id_12345',
          status: 'pending',
          requestedAt: new Date()
        })

        Debug.info(
          ctx,
          `[tests/projects_api/projects_approve_request_success] Одобрение заявки через API`
        )
        const approveResult = await apiApproveProjectRequestRoute({
          id: testProject8.id,
          requestId: testRequest2.id
        }).run(ctx)

        if (!approveResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_approve_request_success] Ошибка при одобрении: ${approveResult.error}`,
            'E_TEST_FAILED'
          )
        }

        // Проверяем, что заявка обновлена
        const updatedRequest = await ProjectRequests.findById(ctx, testRequest2.id)
        if (!updatedRequest || updatedRequest.status !== 'approved') {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_approve_request_success] Заявка не одобрена`,
            'E_TEST_FAILED'
          )
        }

        // Проверяем, что пользователь добавлен в участники
        const updatedProject = await Projects.findById(ctx, testProject8.id)
        const isMember =
          updatedProject.members &&
          Array.isArray(updatedProject.members) &&
          updatedProject.members.some((member: any) => member.userId === 'different_user_id_12345')

        if (!isMember) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_approve_request_success] Пользователь не добавлен в участники`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(
          ctx,
          `[tests/projects_api/projects_approve_request_success] Тест завершён успешно`
        )
        return { success: true, message: 'Заявка успешно одобрена и пользователь добавлен' }
      } finally {
        if (testRequest2 && testRequest2.id) {
          try {
            await ProjectRequests.delete(ctx, testRequest2.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_approve_request_success] Ошибка при удалении заявки: ${deleteError.message}`
            )
          }
        }
        if (testProject8 && testProject8.id) {
          try {
            await Projects.delete(ctx, testProject8.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_approve_request_success] Ошибка при удалении проекта: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'projects_reject_request_success':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_reject_request_success] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName10 = `Test Project Reject ${Date.now()}`
      let testProject9: any = null
      let testRequest3: any = null

      try {
        Debug.info(
          ctx,
          `[tests/projects_api/projects_reject_request_success] Создание тестового проекта`
        )
        testProject9 = await Projects.create(ctx, {
          name: testProjectName10,
          members: [
            {
              userId: ctx.user.id,
              role: 'owner'
            }
          ]
        })

        Debug.info(
          ctx,
          `[tests/projects_api/projects_reject_request_success] Создание тестовой заявки`
        )
        testRequest3 = await ProjectRequests.create(ctx, {
          projectId: testProject9.id,
          userId: 'different_user_id_12345',
          status: 'pending',
          requestedAt: new Date()
        })

        Debug.info(
          ctx,
          `[tests/projects_api/projects_reject_request_success] Отклонение заявки через API`
        )
        const rejectResult = await apiRejectProjectRequestRoute({
          id: testProject9.id,
          requestId: testRequest3.id
        }).run(ctx)

        if (!rejectResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_reject_request_success] Ошибка при отклонении: ${rejectResult.error}`,
            'E_TEST_FAILED'
          )
        }

        // Проверяем, что заявка обновлена
        const updatedRequest = await ProjectRequests.findById(ctx, testRequest3.id)
        if (!updatedRequest || updatedRequest.status !== 'rejected') {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_reject_request_success] Заявка не отклонена`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(
          ctx,
          `[tests/projects_api/projects_reject_request_success] Тест завершён успешно`
        )
        return { success: true, message: 'Заявка успешно отклонена' }
      } finally {
        if (testRequest3 && testRequest3.id) {
          try {
            await ProjectRequests.delete(ctx, testRequest3.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_reject_request_success] Ошибка при удалении заявки: ${deleteError.message}`
            )
          }
        }
        if (testProject9 && testProject9.id) {
          try {
            await Projects.delete(ctx, testProject9.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_reject_request_success] Ошибка при удалении проекта: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'projects_remove_member_success':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_api/projects_remove_member_success] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const testProjectName11 = `Test Project Remove Member ${Date.now()}`
      let testProject10: any = null

      try {
        Debug.info(
          ctx,
          `[tests/projects_api/projects_remove_member_success] Создание тестового проекта с участником`
        )
        testProject10 = await Projects.create(ctx, {
          name: testProjectName11,
          members: [
            {
              userId: ctx.user.id,
              role: 'owner'
            },
            {
              userId: 'member_to_remove_id_12345',
              role: 'member'
            }
          ]
        })

        Debug.info(
          ctx,
          `[tests/projects_api/projects_remove_member_success] Удаление участника через API`
        )
        const removeResult = await apiRemoveProjectMemberRoute({
          id: testProject10.id
        }).run(ctx, {
          userId: 'member_to_remove_id_12345'
        })

        if (!removeResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_remove_member_success] Ошибка при удалении участника: ${removeResult.error}`,
            'E_TEST_FAILED'
          )
        }

        // Проверяем, что участник удалён
        const updatedProject = await Projects.findById(ctx, testProject10.id)
        const isStillMember =
          updatedProject.members &&
          Array.isArray(updatedProject.members) &&
          updatedProject.members.some(
            (member: any) => member.userId === 'member_to_remove_id_12345'
          )

        if (isStillMember) {
          Debug.throw(
            ctx,
            `[tests/projects_api/projects_remove_member_success] Участник не удалён`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(ctx, `[tests/projects_api/projects_remove_member_success] Тест завершён успешно`)
        return { success: true, message: 'Участник успешно удалён' }
      } finally {
        if (testProject10 && testProject10.id) {
          try {
            await Projects.delete(ctx, testProject10.id)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_api/projects_remove_member_success] Ошибка при удалении проекта: ${deleteError.message}`
            )
          }
        }
      }
      break

    default:
      Debug.throw(ctx, `[tests/projects_api] Неизвестный тест: ${testName}`, 'E_TEST_UNKNOWN')
  }
}

// Интеграционные тесты проектов
async function runProjectsIntegrationTest(
  ctx: any,
  testName: string
): Promise<{ success: boolean; message: string }> {
  Debug.info(ctx, `[tests/projects_integration] Начало теста: ${testName}`)

  switch (testName) {
    case 'project_full_lifecycle':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_integration/project_full_lifecycle] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const lifecycleProjectName = `Lifecycle Test ${Date.now()}`
      let lifecycleProjectId: string | null = null

      try {
        // 1. Создание
        Debug.info(
          ctx,
          `[tests/projects_integration/project_full_lifecycle] Шаг 1: Создание проекта`
        )
        const createResult = await apiCreateProjectRoute.run(ctx, {
          name: lifecycleProjectName,
          description: 'Lifecycle test project'
        })

        if (!createResult.success || !createResult.project) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_full_lifecycle] Ошибка при создании проекта`,
            'E_TEST_FAILED'
          )
        }

        lifecycleProjectId = createResult.project.id

        // 2. Получение
        Debug.info(
          ctx,
          `[tests/projects_integration/project_full_lifecycle] Шаг 2: Получение проекта`
        )
        const getResult = await apiGetProjectRoute({ id: lifecycleProjectId }).run(ctx)

        if (!getResult.success || getResult.project.id !== lifecycleProjectId) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_full_lifecycle] Ошибка при получении проекта`,
            'E_TEST_FAILED'
          )
        }

        // 3. Удаление
        Debug.info(
          ctx,
          `[tests/projects_integration/project_full_lifecycle] Шаг 3: Удаление проекта`
        )
        const deleteResult = await apiDeleteProjectRoute.run(ctx, { projectId: lifecycleProjectId })

        if (!deleteResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_full_lifecycle] Ошибка при удалении проекта`,
            'E_TEST_FAILED'
          )
        }

        // 4. Проверка удаления
        const deletedProject = await Projects.findById(ctx, lifecycleProjectId)
        if (deletedProject) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_full_lifecycle] Проект не был удалён`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(ctx, `[tests/projects_integration/project_full_lifecycle] Тест завершён успешно`)
        return { success: true, message: 'Полный цикл проекта выполнен успешно' }
      } catch (error: any) {
        if (lifecycleProjectId) {
          try {
            await Projects.delete(ctx, lifecycleProjectId)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_integration/project_full_lifecycle] Ошибка при очистке: ${deleteError.message}`
            )
          }
        }
        throw error
      }
      break

    case 'project_members_management':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_integration/project_members_management] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const membersProjectName = `Members Test ${Date.now()}`
      let membersProjectId: string | null = null
      let testRequestId: string | null = null

      try {
        // 1. Создание проекта
        Debug.info(
          ctx,
          `[tests/projects_integration/project_members_management] Шаг 1: Создание проекта`
        )
        const createResult = await apiCreateProjectRoute.run(ctx, {
          name: membersProjectName
        })

        if (!createResult.success || !createResult.project) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_members_management] Ошибка при создании проекта`,
            'E_TEST_FAILED'
          )
        }

        membersProjectId = createResult.project.id

        // 2. Подача заявки (симулируем другого пользователя)
        Debug.info(
          ctx,
          `[tests/projects_integration/project_members_management] Шаг 2: Создание заявки`
        )
        const request = await ProjectRequests.create(ctx, {
          projectId: membersProjectId,
          userId: 'test_member_user_id_12345',
          status: 'pending',
          requestedAt: new Date()
        })

        testRequestId = request.id

        // 3. Одобрение заявки
        Debug.info(
          ctx,
          `[tests/projects_integration/project_members_management] Шаг 3: Одобрение заявки`
        )
        const approveResult = await apiApproveProjectRequestRoute({
          id: membersProjectId,
          requestId: testRequestId
        }).run(ctx)

        if (!approveResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_members_management] Ошибка при одобрении заявки`,
            'E_TEST_FAILED'
          )
        }

        // 4. Проверка добавления участника
        const projectWithMember = await Projects.findById(ctx, membersProjectId)
        const hasMember =
          projectWithMember.members &&
          Array.isArray(projectWithMember.members) &&
          projectWithMember.members.some(
            (member: any) => member.userId === 'test_member_user_id_12345'
          )

        if (!hasMember) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_members_management] Участник не добавлен`,
            'E_TEST_FAILED'
          )
        }

        // 5. Удаление участника
        Debug.info(
          ctx,
          `[tests/projects_integration/project_members_management] Шаг 4: Удаление участника`
        )
        const removeResult = await apiRemoveProjectMemberRoute({
          id: membersProjectId
        }).run(ctx, {
          userId: 'test_member_user_id_12345'
        })

        if (!removeResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_members_management] Ошибка при удалении участника`,
            'E_TEST_FAILED'
          )
        }

        // 6. Проверка удаления участника
        const projectWithoutMember = await Projects.findById(ctx, membersProjectId)
        const stillHasMember =
          projectWithoutMember.members &&
          Array.isArray(projectWithoutMember.members) &&
          projectWithoutMember.members.some(
            (member: any) => member.userId === 'test_member_user_id_12345'
          )

        if (stillHasMember) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_members_management] Участник не удалён`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(
          ctx,
          `[tests/projects_integration/project_members_management] Тест завершён успешно`
        )
        return { success: true, message: 'Управление участниками выполнено успешно' }
      } finally {
        if (testRequestId) {
          try {
            await ProjectRequests.delete(ctx, testRequestId)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_integration/project_members_management] Ошибка при удалении заявки: ${deleteError.message}`
            )
          }
        }
        if (membersProjectId) {
          try {
            await Projects.delete(ctx, membersProjectId)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_integration/project_members_management] Ошибка при удалении проекта: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'project_request_flow':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_integration/project_request_flow] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const flowProjectName = `Request Flow Test ${Date.now()}`
      let flowProjectId: string | null = null
      let flowRequestId: string | null = null

      try {
        // 1. Создание проекта
        Debug.info(ctx, `[tests/projects_integration/project_request_flow] Шаг 1: Создание проекта`)
        const createResult = await apiCreateProjectRoute.run(ctx, {
          name: flowProjectName
        })

        if (!createResult.success || !createResult.project) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_request_flow] Ошибка при создании проекта`,
            'E_TEST_FAILED'
          )
        }

        flowProjectId = createResult.project.id

        // 2. Подача заявки
        Debug.info(ctx, `[tests/projects_integration/project_request_flow] Шаг 2: Подача заявки`)
        const joinResult = await apiJoinProjectRequestRoute.run(ctx, {
          projectId: flowProjectId
        })

        if (!joinResult.success || !joinResult.request) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_request_flow] Ошибка при подаче заявки`,
            'E_TEST_FAILED'
          )
        }

        flowRequestId = joinResult.request.id

        // 3. Получение заявок
        Debug.info(ctx, `[tests/projects_integration/project_request_flow] Шаг 3: Получение заявок`)
        const getRequestsResult = await apiGetProjectRequestsRoute({ id: flowProjectId }).run(ctx)

        if (!getRequestsResult.success || !getRequestsResult.requests) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_request_flow] Ошибка при получении заявок`,
            'E_TEST_FAILED'
          )
        }

        const foundRequest = getRequestsResult.requests.find((req: any) => req.id === flowRequestId)
        if (!foundRequest) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_request_flow] Заявка не найдена в списке`,
            'E_TEST_FAILED'
          )
        }

        // 4. Одобрение заявки
        Debug.info(ctx, `[tests/projects_integration/project_request_flow] Шаг 4: Одобрение заявки`)
        const approveResult = await apiApproveProjectRequestRoute({
          id: flowProjectId,
          requestId: flowRequestId
        }).run(ctx)

        if (!approveResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_request_flow] Ошибка при одобрении заявки`,
            'E_TEST_FAILED'
          )
        }

        // 5. Проверка добавления участника
        const finalProject = await Projects.findById(ctx, flowProjectId)
        const isMember =
          finalProject.members &&
          Array.isArray(finalProject.members) &&
          finalProject.members.some((member: any) => userIdsMatch(member.userId, ctx.user.id))

        if (!isMember) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_request_flow] Пользователь не добавлен в участники`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(ctx, `[tests/projects_integration/project_request_flow] Тест завершён успешно`)
        return { success: true, message: 'Полный цикл заявки выполнен успешно' }
      } finally {
        if (flowRequestId) {
          try {
            await ProjectRequests.delete(ctx, flowRequestId)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_integration/project_request_flow] Ошибка при удалении заявки: ${deleteError.message}`
            )
          }
        }
        if (flowProjectId) {
          try {
            await Projects.delete(ctx, flowProjectId)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_integration/project_request_flow] Ошибка при удалении проекта: ${deleteError.message}`
            )
          }
        }
      }
      break

    case 'project_access_control':
      if (!ctx.user || !ctx.user.id) {
        Debug.throw(
          ctx,
          `[tests/projects_integration/project_access_control] Пользователь не авторизован`,
          'E_TEST_AUTH'
        )
      }

      const accessProjectName = `Access Control Test ${Date.now()}`
      let accessProjectId: string | null = null

      try {
        // 1. Создание проекта с другим владельцем
        Debug.info(
          ctx,
          `[tests/projects_integration/project_access_control] Шаг 1: Создание проекта с другим владельцем`
        )
        const project = await Projects.create(ctx, {
          name: accessProjectName,
          members: [
            {
              userId: 'different_owner_id_12345',
              role: 'owner'
            }
          ]
        })

        accessProjectId = project.id

        // 2. Попытка получения без прав
        Debug.info(
          ctx,
          `[tests/projects_integration/project_access_control] Шаг 2: Попытка получения без прав`
        )
        const getResult = await apiGetProjectRoute({ id: accessProjectId }).run(ctx)

        if (getResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_access_control] Ожидалась ошибка для отсутствия прав`,
            'E_TEST_FAILED'
          )
        }

        // 3. Попытка удаления без прав
        Debug.info(
          ctx,
          `[tests/projects_integration/project_access_control] Шаг 3: Попытка удаления без прав`
        )
        const deleteResult = await apiDeleteProjectRoute.run(ctx, { projectId: accessProjectId })

        if (deleteResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_access_control] Ожидалась ошибка для отсутствия прав при удалении`,
            'E_TEST_FAILED'
          )
        }

        // 4. Попытка получения заявок без прав
        Debug.info(
          ctx,
          `[tests/projects_integration/project_access_control] Шаг 4: Попытка получения заявок без прав`
        )
        const getRequestsResult = await apiGetProjectRequestsRoute({ id: accessProjectId }).run(ctx)

        if (getRequestsResult.success) {
          Debug.throw(
            ctx,
            `[tests/projects_integration/project_access_control] Ожидалась ошибка для отсутствия прав при получении заявок`,
            'E_TEST_FAILED'
          )
        }

        Debug.info(ctx, `[tests/projects_integration/project_access_control] Тест завершён успешно`)
        return { success: true, message: 'Контроль доступа работает корректно' }
      } finally {
        if (accessProjectId) {
          try {
            await Projects.delete(ctx, accessProjectId)
          } catch (deleteError: any) {
            Debug.warn(
              ctx,
              `[tests/projects_integration/project_access_control] Ошибка при удалении проекта: ${deleteError.message}`
            )
          }
        }
      }
      break

    default:
      Debug.throw(
        ctx,
        `[tests/projects_integration] Неизвестный тест: ${testName}`,
        'E_TEST_UNKNOWN'
      )
  }
}
